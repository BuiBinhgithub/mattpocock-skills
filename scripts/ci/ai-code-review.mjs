#!/usr/bin/env node

/**
 * AI Code Reviewer
 * Reads a Pull Request diff, reviews it against this repository's documented
 * standards (AGENTS.md, CONTEXT.md, ADRs, packages/README.md), and posts the
 * findings as an inline Pull Request review.
 *
 * Requires env:
 *   OPENROUTER_API_KEY - OpenRouter API token
 *   GITHUB_TOKEN       - token with pull-requests: write
 *   PR_NUMBER          - pull request number to review
 *   REPO               - "owner/name"
 *   HEAD_SHA           - commit SHA of the PR head (for inline comment anchoring)
 *
 * Optional:
 *   OPENROUTER_MODEL   - comma-separated model ids, tried in order. Defaults to
 *                        a free-tier coding model plus two fallbacks.
 *   MAX_DIFF_CHARS     - diff truncation budget, defaults to 60000
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const GITHUB_API = "https://api.github.com";

/**
 * Ordered list of models to try. The free tier is rate limited and its lineup
 * changes often, so a single hard-coded model id is a liability: it goes stale
 * and the reviewer dies. Set OPENROUTER_MODEL to a comma-separated list to
 * override.
 */
const MODEL_CHAIN = (
  process.env.OPENROUTER_MODEL ??
  "poolside/laguna-s-2.1:free,cohere/north-mini-code:free,nvidia/nemotron-3-super-120b-a12b:free"
)
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const MAX_DIFF_CHARS = Number(process.env.MAX_DIFF_CHARS ?? 60000);
const MAX_FINDINGS = 12;

/**
 * Statuses worth retrying on a different model: rate limited, model retired,
 * or out of credit. A 401 means the API key itself is wrong, so retrying every
 * model would only waste time.
 */
const RETRYABLE_STATUSES = new Set([402, 404, 429]);

/**
 * @typedef {Object} Finding
 * @property {string} file
 * @property {number} line
 * @property {"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"} severity
 * @property {"standards" | "spec"} axis
 * @property {string} title
 * @property {string} body
 * @property {string} standard
 */

const SEVERITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const AXES = new Set(["standards", "spec"]);

// -------------------------------------------------------------
// Repository standards
// -------------------------------------------------------------

/**
 * Collect the documents that define this repository's standards so the
 * review is anchored to project decisions rather than generic advice.
 * @returns {string}
 */
function loadStandards() {
  const parts = [];
  const files = [
    "AGENTS.md",
    "CONTEXT.md",
    "packages/README.md",
    ".dependency-cruiser.cjs",
  ];

  for (const file of files) {
    const full = path.join(ROOT_DIR, file);
    if (fs.existsSync(full)) {
      parts.push(`--- ${file} ---\n${fs.readFileSync(full, "utf8")}`);
    }
  }

  const adrDir = path.join(ROOT_DIR, "docs", "adr");
  if (fs.existsSync(adrDir)) {
    for (const name of fs.readdirSync(adrDir).sort()) {
      if (!name.endsWith(".md")) continue;
      parts.push(
        `--- docs/adr/${name} ---\n${fs.readFileSync(path.join(adrDir, name), "utf8")}`
      );
    }
  }

  const specDir = path.join(ROOT_DIR, ".scratch");
  if (fs.existsSync(specDir)) {
    for (const feature of fs.readdirSync(specDir)) {
      const specPath = path.join(specDir, feature, "spec.md");
      if (fs.existsSync(specPath)) {
        parts.push(
          `--- .scratch/${feature}/spec.md ---\n${fs.readFileSync(specPath, "utf8")}`
        );
      }
    }
  }

  return parts.join("\n\n");
}

// -------------------------------------------------------------
// Diff parsing
// -------------------------------------------------------------

/**
 * Parse a unified diff into per-file structures.
 * @param {string} diff
 * @returns {{ files: Map<string, {hunks: Array<{start: number, count: number}>, additions: Set<number>, removals: Set<number>, patch: string}> }}
 */
function parseDiff(diff) {
  const files = new Map();
  const lines = diff.split("\n");
  let currentPath = null;
  let patchLines = [];

  const flush = () => {
    if (currentPath) {
      const patch = patchLines.join("\n");
      files.set(currentPath, {
        hunks: parseHunks(patchLines),
        additions: addedLines(patchLines),
        patch,
      });
    }
    currentPath = null;
    patchLines = [];
  };

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flush();
      const match = line.match(/ b\/(.+)$/);
      currentPath = match ? match[1] : null;
      continue;
    }
    if (currentPath) patchLines.push(line);
  }
  flush();

  return { files };
}

/**
 * @param {string[]} patchLines
 * @returns {Array<{start: number, count: number}>}
 */
function parseHunks(patchLines) {
  const hunks = [];
  for (const line of patchLines) {
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (match) {
      hunks.push({
        start: Number(match[1]),
        count: match[2] === undefined ? 1 : Number(match[2]),
      });
    }
  }
  return hunks;
}

/**
 * Line numbers on the RIGHT (new) side of the diff that were added.
 * These are the only lines GitHub accepts inline comments on.
 * @param {string[]} patchLines
 * @returns {Set<number>}
 */
function addedLines(patchLines) {
  const added = new Set();
  let current = 0;

  for (const line of patchLines) {
    const match = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (match) {
      current = Number(match[1]);
      continue;
    }
    if (line.startsWith("+++")) continue;
    if (line.startsWith("+")) {
      added.add(current);
      current += 1;
    } else if (line.startsWith("-")) {
      continue;
    } else if (line.startsWith(" ") || line === "") {
      current += 1;
    }
  }

  return added;
}

// -------------------------------------------------------------
// OpenRouter
// -------------------------------------------------------------

/**
 * Build the review prompt. Kept separate from the request so every model in the
 * chain receives an identical prompt.
 * @param {string} diff
 * @param {string} standards
 * @returns {string}
 */
function buildReviewPrompt(diff, standards) {
  return [
    "You are an AI code reviewer for a TypeScript monorepo.",
    "",
    "Review the pull request diff against TWO axes:",
    "  - standards: does the diff follow this repository's documented standards?",
    "  - spec: does the diff match the intent described in the specs above?",
    "",
    "Only report real, concrete problems visible in the diff. Do not report",
    "style preferences, praise, or suggestions that are not actionable.",
    "If the diff is clean, return an empty findings array.",
    "",
    "Anchor every finding to a line that appears as an ADDED line in the diff,",
    "because only added lines can receive inline comments.",
    "",
    "Return ONLY a JSON object, no prose and no code fences:",
    '{"findings":[{"file":"<path>","line":<int>,"severity":"CRITICAL|HIGH|MEDIUM|LOW",',
    '"axis":"standards|spec","title":"<short title>","standard":"<doc or rule cited>",',
    '"body":"<explanation and how to fix>"}]}',
    "",
    "=== REPOSITORY STANDARDS ===",
    standards,
    "",
    "=== PULL REQUEST DIFF ===",
    diff,
  ].join("\n");
}

/**
 * Ask a single model for a structured review.
 * @param {string} model
 * @param {string} prompt
 * @returns {Promise<Finding[]>}
 */
async function callModel(model, prompt) {
  const response = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: "You review code. Reply with JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content ?? "";
  return extractFindings(content);
}

/**
 * Walk the model chain until one of them answers.
 * @param {string} diff
 * @param {string} standards
 * @returns {Promise<{findings: Finding[], model: string, skipped: string[]}>}
 */
async function requestReview(diff, standards) {
  const prompt = buildReviewPrompt(diff, standards);
  const skipped = [];

  for (const [index, model] of MODEL_CHAIN.entries()) {
    try {
      const findings = await callModel(model, prompt);
      if (skipped.length > 0) {
        console.log(`Fell back to ${model} after: ${skipped.join(", ")}`);
      } else {
        console.log(`Reviewed with ${model}.`);
      }
      return { findings, model, skipped };
    } catch (error) {
      const status = Number(/OpenRouter (\d+)/.exec(error.message)?.[1]);

      if (RETRYABLE_STATUSES.has(status) && index < MODEL_CHAIN.length - 1) {
        console.warn(`${model} failed (${status}), trying next model.`);
        skipped.push(model);
        continue;
      }

      throw new Error(
        skipped.length > 0
          ? `${error.message} (đã thử: ${skipped.join(", ")})`
          : error.message
      );
    }
  }

  throw new Error("Model chain rỗng: OPENROUTER_MODEL không chứa model nào.");
}

/**
 * Pull a JSON object out of a model response that may be wrapped in prose or
 * code fences.
 * @param {string} content
 * @returns {Finding[]}
 */
function extractFindings(content) {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return [];

  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return Array.isArray(parsed.findings) ? parsed.findings : [];
  } catch {
    return [];
  }
}

// -------------------------------------------------------------
// Finding validation
// -------------------------------------------------------------

/**
 * Keep only findings that GitHub can actually anchor, and normalise their
 * shape. Free-tier models frequently hallucinate paths or line numbers.
 * @param {unknown[]} raw
 * @param {Map<string, {additions: Set<number>}>} diffFiles
 * @returns {{inline: Finding[], dropped: number}}
 */
function validateFindings(raw, diffFiles) {
  const inline = [];
  let dropped = 0;

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      dropped += 1;
      continue;
    }

    const file = String(item.file ?? "").trim();
    const line = Number(item.line);
    const severity = String(item.severity ?? "").toUpperCase();
    const axis = String(item.axis ?? "").toLowerCase();
    const title = String(item.title ?? "").trim();
    const body = String(item.body ?? "").trim();
    const standard = String(item.standard ?? "").trim();

    if (!file || !Number.isInteger(line) || line <= 0) {
      dropped += 1;
      continue;
    }
    if (!SEVERITIES.has(severity) || !AXES.has(axis)) {
      dropped += 1;
      continue;
    }
    if (!title || !body) {
      dropped += 1;
      continue;
    }

    const entry = diffFiles.get(file);
    if (!entry || !entry.additions.has(line)) {
      dropped += 1;
      continue;
    }

    inline.push({ file, line, severity, axis, title, body, standard });
  }

  const seen = new Set();
  const deduped = inline.filter((finding) => {
    const key = `${finding.file}:${finding.line}:${finding.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { inline: deduped.slice(0, MAX_FINDINGS), dropped };
}

// -------------------------------------------------------------
// GitHub
// -------------------------------------------------------------

/**
 * @param {number} prNumber
 * @returns {Promise<string>}
 */
async function fetchDiff(prNumber) {
  const response = await fetch(
    `${GITHUB_API}/repos/${process.env.REPO}/pulls/${prNumber}`,
    {
      headers: {
        Accept: "application/vnd.github.v3.diff",
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        "User-Agent": "ai-code-review",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub diff ${response.status}`);
  }

  return response.text();
}

const SEVERITY_ICON = {
  CRITICAL: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "🔵",
};

/**
 * @param {Finding[]} findings
 * @param {number} dropped
 * @param {boolean} truncated
 * @param {string} model
 * @returns {string}
 */
function buildSummary(findings, dropped, truncated, model) {
  if (findings.length === 0) {
    return [
      "### 🤖 AI Code Review",
      "",
      "Không phát hiện vấn đề nào trong diff.",
      "",
      `> Model: \`${model}\` · Standards: \`AGENTS.md\` + \`CONTEXT.md\` + \`docs/adr/\` + spec trong \`.scratch/\``,
    ].join("\n");
  }

  const blocking = findings.filter(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  );

  const rows = findings
    .map(
      (f) =>
        `| ${SEVERITY_ICON[f.severity]} ${f.severity} | ${f.axis} | \`${f.file}:${f.line}\` | ${f.title} |`
    )
    .join("\n");

  const lines = [
    "### 🤖 AI Code Review",
    "",
    blocking.length > 0
      ? `**${blocking.length} finding mức CRITICAL/HIGH** cần được xử lý trước khi merge.`
      : "Không có finding CRITICAL/HIGH.",
    "",
    `| Mức độ | Trục | Vị trí | Vấn đề |`,
    `| :--- | :--- | :--- | :--- |`,
    rows,
    "",
    "Chi tiết và hướng sửa nằm trong comment inline trên từng dòng.",
    "",
    `> Model: \`${model}\` · Dropped ${dropped} finding không neo được vào diff${
      truncated ? " · Diff bị cắt bớt do quá lớn." : ""
    }`,
  ];

  return lines.join("\n");
}

/**
 * @param {Finding[]} findings
 * @returns {string}
 */
function buildInlineBody(finding) {
  const icon = SEVERITY_ICON[finding.severity] ?? "⚪";
  const lines = [`**${icon} ${finding.severity} · ${finding.title}**`, ""];
  lines.push(finding.body);
  if (finding.standard) {
    lines.push("", `> Vi phạm: \`${finding.standard}\``);
  }
  return lines.join("\n");
}

// -------------------------------------------------------------
// Main
// -------------------------------------------------------------

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const token = process.env.GITHUB_TOKEN;
  const prNumber = process.env.PR_NUMBER;
  const repo = process.env.REPO;
  const headSha = process.env.HEAD_SHA;

  if (!apiKey || !token || !prNumber || !repo || !headSha) {
    console.error(
      "Missing required env: OPENROUTER_API_KEY, GITHUB_TOKEN, PR_NUMBER, REPO, HEAD_SHA"
    );
    process.exit(1);
  }

  const diff = await fetchDiff(prNumber);
  if (!diff.trim()) {
    console.log("Empty diff, nothing to review.");
    return;
  }

  const truncated = diff.length > MAX_DIFF_CHARS;
  const diffBody = truncated
    ? `${diff.slice(0, MAX_DIFF_CHARS)}\n\n... [diff truncated]`
    : diff;

  const { files } = parseDiff(diff);
  console.log(`Parsed ${files.size} changed file(s) from diff.`);

  let result;
  try {
    result = await requestReview(diffBody, loadStandards());
  } catch (error) {
    console.error(`Review request failed: ${error.message}`);
    await postFallback(prNumber, headSha, repo, token, error.message);
    process.exit(1);
  }

  const { findings: raw, model } = result;
  const { inline, dropped } = validateFindings(raw, files);
  console.log(
    `Model returned ${raw.length} finding(s), posting ${inline.length}.`
  );

  await submitReview({
    prNumber,
    headSha,
    repo,
    token,
    findings: inline,
    dropped,
    truncated,
    model,
  });
}

/**
 * Post a comment explaining that the reviewer itself failed, so a broken or
 * missing API key is never mistaken for "code looks fine".
 * @param {string} prNumber
 * @param {string} headSha
 * @param {string} repo
 * @param {string} token
 * @param {string} message
 */
async function postFallback(prNumber, headSha, repo, token, message) {
  const body = [
    "### 🤖 AI Code Review",
    "",
    "⚠️ **Reviewer không chạy được.** Đây không phải kết quả review.",
    "",
    "```",
    message,
    "```",
  ].join("\n");

  try {
    await submitReview({
      prNumber,
      headSha,
      repo,
      token,
      findings: [],
      dropped: 0,
      truncated: false,
      forcedBody: body,
    });
  } catch (error) {
    console.error(`Fallback comment failed: ${error.message}`);
  }
}

/**
 * @param {{prNumber: string, headSha: string, repo: string, token: string, findings: Finding[], dropped: number, truncated: boolean, model?: string, forcedBody?: string}} input
 */
async function submitReview({
  prNumber,
  headSha,
  repo,
  token,
  findings,
  dropped,
  truncated,
  model,
  forcedBody,
}) {
  const body =
    forcedBody ??
    buildSummary(findings, dropped, truncated, model ?? MODEL_CHAIN[0]);

  const event = findings.some(
    (f) => f.severity === "CRITICAL" || f.severity === "HIGH"
  )
    ? "REQUEST_CHANGES"
    : "COMMENT";

  const payload = {
    commit_id: headSha,
    body,
    event,
    comments: findings.map((finding) => ({
      path: finding.file,
      line: finding.line,
      side: "RIGHT",
      body: buildInlineBody(finding),
    })),
  };

  const response = await fetch(
    `${GITHUB_API}/repos/${repo}/pulls/${prNumber}/reviews`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "ai-code-review",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Submit review ${response.status}: ${errorBody.slice(0, 500)}`
    );
  }

  console.log(`Review submitted with ${findings.length} inline comment(s).`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
