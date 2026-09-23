#!/usr/bin/env node

/**
 * Audit Critical Bugs & Flow Integrity
 * Automated rule auditor to detect flow-breaking bugs, security vulnerabilities,
 * and architectural violations across the monorepo.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();

// Output reports
const REPORT_JSON_PATH = path.join(
  ROOT_DIR,
  ".github",
  "critical-bugs-report.json"
);
const REPORT_MD_PATH = path.join(ROOT_DIR, "critical-bugs-summary.md");

/**
 * @typedef {Object} Violation
 * @property {string} ruleId
 * @property {"CRITICAL" | "HIGH" | "MEDIUM"} severity
 * @property {string} file
 * @property {number} line
 * @property {string} codeSnippet
 * @property {string} title
 * @property {string} description
 * @property {string} remediation
 */

/** @type {Violation[]} */
const violations = [];

/**
 * Recursively list files matching pattern
 * @param {string} dir
 * @param {RegExp} filterRegex
 * @returns {string[]}
 */
function walk(dir, filterRegex) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist" ||
        entry.name === ".turbo" ||
        entry.name === ".git" ||
        entry.name === ".scratch"
      ) {
        continue;
      }
      results = results.concat(walk(fullPath, filterRegex));
    } else if (filterRegex.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// -------------------------------------------------------------
// RULE 1: ARCH-001 - Direct PrismaService Injection / Leak
// -------------------------------------------------------------
function checkRuleArch001() {
  const apiSrcDir = path.join(ROOT_DIR, "apps", "api", "src");
  const tsFiles = walk(apiSrcDir, /\.ts$/);

  for (const file of tsFiles) {
    const relPath = path.relative(ROOT_DIR, file);
    // Whitelist database folder and repository files
    if (
      relPath.includes("src/database/") ||
      relPath.endsWith(".repository.ts") ||
      relPath.endsWith("app.module.ts") // AppModule imports/provides PrismaService
    ) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Check for importing PrismaService in domain services or controllers
      if (
        /import\s+.*PrismaService.*from/.test(line) ||
        /constructor\s*\(.*PrismaService/.test(line) ||
        /private\s+.*prisma:\s*PrismaService/.test(line)
      ) {
        violations.push({
          ruleId: "ARCH-001",
          severity: "CRITICAL",
          file: relPath,
          line: index + 1,
          codeSnippet: line.trim(),
          title: "Direct PrismaService Injection (Architecture Violation)",
          description:
            "Domain services and controllers must NEVER inject or import PrismaService directly. Database operations must be encapsulated inside custom Repositories.",
          remediation:
            "Inject the custom repository interface (e.g. `@Inject(USER_REPOSITORY) private readonly userRepository: UserRepository`) instead.",
        });
      }
    });
  }
}

// -------------------------------------------------------------
// RULE 2: SEC-001 - Insecure Authentication Cookie Flags
// -------------------------------------------------------------
function checkRuleSec001() {
  const targetFiles = [
    ...walk(path.join(ROOT_DIR, "apps", "api", "src"), /\.ts$/),
    ...walk(path.join(ROOT_DIR, "apps", "web", "src"), /\.(ts|tsx)$/),
  ];

  for (const file of targetFiles) {
    const relPath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    // Check res.cookie calls
    content.replace(/res\.cookie\s*\(([^)]+)\)/gs, (match, args, offset) => {
      const lineNum = content.slice(0, offset).split("\n").length;
      if (!args.includes("httpOnly: true") && !args.includes("httpOnly:true")) {
        violations.push({
          ruleId: "SEC-001",
          severity: "CRITICAL",
          file: relPath,
          line: lineNum,
          codeSnippet: match.split("\n")[0].trim() + "...",
          title: "Insecure Authentication Cookie (Missing httpOnly: true)",
          description:
            "Auth cookies without `httpOnly: true` can be accessed by client-side scripts, exposing sessions to XSS token theft.",
          remediation:
            "Ensure all auth cookies (accessToken, refreshToken) are set with `{ httpOnly: true, secure: ..., sameSite: 'lax' }`.",
        });
      }
    });

    // Check res.clearCookie calls
    content.replace(
      /res\.clearCookie\s*\(([^)]+)\)/gs,
      (match, args, offset) => {
        const lineNum = content.slice(0, offset).split("\n").length;
        const surroundingSnippet = content.slice(
          Math.max(0, offset - 300),
          offset + 100
        );
        const hasSecureFlags =
          (args.includes("httpOnly") && args.includes("sameSite")) ||
          (surroundingSnippet.includes("httpOnly: true") &&
            surroundingSnippet.includes("sameSite"));
        if (!hasSecureFlags) {
          violations.push({
            ruleId: "SEC-001",
            severity: "CRITICAL",
            file: relPath,
            line: lineNum,
            codeSnippet: match.split("\n")[0].trim(),
            title: "Incomplete Cookie Clearing Options on Logout",
            description:
              "Calling `res.clearCookie` without matching `httpOnly`, `sameSite`, or `secure` flags causes modern browsers to reject clearing the cookie.",
            remediation:
              "Pass the full options object `{ path: '/', httpOnly: true, secure: isProd, sameSite: 'lax' }` to `res.clearCookie`.",
          });
        }
      }
    );
  }
}

// -------------------------------------------------------------
// RULE 3: SEC-002 - Hardcoded Secrets & Credentials
// -------------------------------------------------------------
function checkRuleSec002() {
  const targetFiles = [
    ...walk(path.join(ROOT_DIR, "apps", "api", "src"), /\.ts$/),
    ...walk(path.join(ROOT_DIR, "apps", "web", "src"), /\.(ts|tsx)$/),
    ...walk(path.join(ROOT_DIR, "packages"), /\.ts$/),
  ];

  const secretPatterns = [
    /secret:\s*["'](?!(process\.env|[A-Z_]+))([a-zA-Z0-9_\-\.]{8,})["']/i,
    /jwtSecret\s*=\s*["'][^"']+["']/i,
    /api[_-]?key\s*=\s*["'][a-zA-Z0-9_\-]{16,}["']/i,
  ];

  for (const file of targetFiles) {
    const relPath = path.relative(ROOT_DIR, file);
    if (relPath.includes("test") || relPath.endsWith(".spec.ts")) continue;

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Exclude process.env or fallback patterns like `process.env.JWT_SECRET || "default"`
      if (line.includes("process.env")) return;

      for (const pattern of secretPatterns) {
        if (pattern.test(line)) {
          violations.push({
            ruleId: "SEC-002",
            severity: "CRITICAL",
            file: relPath,
            line: index + 1,
            codeSnippet: line.trim(),
            title: "Hardcoded Secret / Credential Detected",
            description:
              "Sensitive tokens, cryptographic secrets, or credentials must never be hardcoded in production source code.",
            remediation:
              "Read the secret dynamically from environment variables (e.g. `process.env.JWT_SECRET`) or NestJS `ConfigService`.",
          });
        }
      }
    });
  }
}

// -------------------------------------------------------------
// RULE 4: TYPE-001 - Dangerous `as any` Type Assertions
// -------------------------------------------------------------
function checkRuleType001() {
  const targetFiles = [
    ...walk(path.join(ROOT_DIR, "apps", "api", "src"), /\.ts$/),
    ...walk(path.join(ROOT_DIR, "apps", "web", "src"), /\.(ts|tsx)$/),
    ...walk(path.join(ROOT_DIR, "packages", "contracts"), /\.ts$/),
  ];

  for (const file of targetFiles) {
    const relPath = path.relative(ROOT_DIR, file);
    if (
      relPath.endsWith(".d.ts") ||
      relPath.includes(".test.") ||
      relPath.includes(".spec.")
    ) {
      continue;
    }

    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (/\bas\s+any\b/.test(line) || /<any>/.test(line)) {
        violations.push({
          ruleId: "TYPE-001",
          severity: "HIGH",
          file: relPath,
          line: index + 1,
          codeSnippet: line.trim(),
          title: "Dangerous `as any` Type Assertion",
          description:
            "Using `as any` disables compile-time type validation, increasing the danger of runtime null-pointer exceptions and state corruption.",
          remediation:
            "Use strict contracts from `@repo/contracts` or `@total-typescript/shoehorn` instead of bypassing types with `as any`.",
        });
      }
    });
  }
}

// -------------------------------------------------------------
// RULE 5: FLOW-001 - Route Guard & Middleware Protection
// -------------------------------------------------------------
function checkRuleFlow001() {
  // Check NestJS AuthController endpoints
  const authControllerPath = path.join(
    ROOT_DIR,
    "apps",
    "api",
    "src",
    "modules",
    "auth",
    "auth.controller.ts"
  );
  if (fs.existsSync(authControllerPath)) {
    const content = fs.readFileSync(authControllerPath, "utf8");
    // getMe must be protected by JwtAuthGuard
    if (
      content.includes("async getMe") &&
      !content.includes("@UseGuards(JwtAuthGuard)")
    ) {
      violations.push({
        ruleId: "FLOW-001",
        severity: "CRITICAL",
        file: "apps/api/src/modules/auth/auth.controller.ts",
        line: 1,
        codeSnippet: "@Get('me')",
        title: "Unprotected User Profile Endpoint",
        description:
          "The `/auth/me` endpoint returns sensitive user session profile information but is missing `@UseGuards(JwtAuthGuard)`.",
        remediation:
          "Add `@UseGuards(JwtAuthGuard)` to the `getMe` endpoint method.",
      });
    }
  }

  // Check Next.js middleware protection
  const middlewarePath = path.join(
    ROOT_DIR,
    "apps",
    "web",
    "src",
    "middleware.ts"
  );
  if (!fs.existsSync(middlewarePath)) {
    violations.push({
      ruleId: "FLOW-001",
      severity: "CRITICAL",
      file: "apps/web/src/middleware.ts",
      line: 1,
      codeSnippet: "missing middleware.ts",
      title: "Missing Next.js Edge Auth Middleware",
      description:
        "The web application lacks Edge Middleware to protect private routes like `/dashboard` before rendering.",
      remediation:
        "Implement `src/middleware.ts` to redirect unauthenticated users to `/login`.",
    });
  } else {
    const content = fs.readFileSync(middlewarePath, "utf8");
    if (!content.includes("/dashboard") || !content.includes("accessToken")) {
      violations.push({
        ruleId: "FLOW-001",
        severity: "CRITICAL",
        file: "apps/web/src/middleware.ts",
        line: 1,
        codeSnippet: content.slice(0, 100),
        title: "Incomplete Route Protection in Middleware",
        description:
          "Next.js middleware does not check for `accessToken` or does not protect `/dashboard` route.",
        remediation:
          "Ensure middleware inspects `accessToken` cookie and redirects to `/login` when missing.",
      });
    }
  }
}

// -------------------------------------------------------------
// RULE 6: FLOW-002 - Unhandled Async Database Mutations
// -------------------------------------------------------------
function checkRuleFlow002() {
  const serviceFiles = walk(
    path.join(ROOT_DIR, "apps", "api", "src", "modules"),
    /\.service\.ts$/
  );

  for (const file of serviceFiles) {
    const relPath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Catch calls like: this.userRepository.create(...) without await or return
      if (
        /this\.[a-zA-Z0-9_]+Repository\.(create|update|delete|save)\(/.test(
          line
        ) &&
        !line.includes("await") &&
        !line.includes("return")
      ) {
        violations.push({
          ruleId: "FLOW-002",
          severity: "HIGH",
          file: relPath,
          line: index + 1,
          codeSnippet: line.trim(),
          title: "Unawaited Async Database Mutation",
          description:
            "Asynchronous database mutation was invoked without `await` or `return`, leading to race conditions and potential data inconsistency.",
          remediation: "Prefix the database mutation call with `await`.",
        });
      }
    });
  }
}

// Run all audit checks
console.log("🛡️  Starting Critical Bug & Flow Integrity Audit...\n");

checkRuleArch001();
checkRuleSec001();
checkRuleSec002();
checkRuleType001();
checkRuleFlow001();
checkRuleFlow002();

// Ensure output directory exists
const githubDir = path.join(ROOT_DIR, ".github");
if (!fs.existsSync(githubDir)) {
  fs.mkdirSync(githubDir, { recursive: true });
}

// Output JSON report
const reportData = {
  timestamp: new Date().toISOString(),
  totalViolations: violations.length,
  criticalCount: violations.filter((v) => v.severity === "CRITICAL").length,
  highCount: violations.filter((v) => v.severity === "HIGH").length,
  canMerge: violations.length === 0,
  violations,
};

fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(reportData, null, 2), "utf8");

// Generate Markdown Summary for CI & PR Comment
let markdown = `## 🛡️ Báo cáo Kiểm tra Critical Bugs & Luồng Nguy hiểm\n\n`;

if (violations.length === 0) {
  markdown += `> 🎉 **Không phát hiện lỗi nghiêm trọng (0 Critical / 0 High Bugs).**\n`;
  markdown += `> Luồng kiến trúc, bảo mật session cookie, và tính toàn vẹn hệ thống đều đạt chuẩn.\n\n`;
  markdown += `### 🟢 KẾT LUẬN MERGE VERDICT: **SẴN SÀNG MERGE (READY TO MERGE)**\n`;
} else {
  markdown += `> ⚠️ **Phát hiện ${violations.length} vi phạm (${reportData.criticalCount} Critical, ${reportData.highCount} High).**\n\n`;
  markdown += `| Mức độ | Mã Rule | Vị trí | Vấn đề |\n`;
  markdown += `| :--- | :--- | :--- | :--- |\n`;

  for (const v of violations) {
    const badge = v.severity === "CRITICAL" ? "🔴 CRITICAL" : "🟠 HIGH";
    markdown += `| ${badge} | \`${v.ruleId}\` | \`${v.file}:${v.line}\` | **${v.title}** |\n`;
  }

  markdown += `\n### 📋 Chi tiết các lỗi cần khắc phục:\n\n`;

  for (const v of violations) {
    markdown += `<details open>\n`;
    markdown += `<summary><b>[${v.severity}] ${v.ruleId}: ${v.title}</b> (tại <code>${v.file}:${v.line}</code>)</summary>\n\n`;
    markdown += `- **Code vi phạm**: \`${v.codeSnippet}\`\n`;
    markdown += `- **Mô tả rủi ro**: ${v.description}\n`;
    markdown += `- **Cách khắc phục**: ${v.remediation}\n`;
    markdown += `</details>\n\n`;
  }

  markdown += `### 🔴 KẾT LUẬN MERGE VERDICT: **CHẶN MERGE (DO NOT MERGE / BLOCKED)**\n`;
  markdown += `> ⛔ PR này chứa lỗi nghiêm trọng có thể gây mất an toàn luồng xác thực hoặc hỏng dữ liệu. **Bắt buộc phải sửa hết các lỗi trên trước khi merge.**\n`;
}

fs.writeFileSync(REPORT_MD_PATH, markdown, "utf8");

// Print Terminal Output
console.log(markdown);

if (violations.length > 0) {
  console.error(
    `\n❌ Audit thất bại với ${violations.length} lỗi critical/high.`
  );
  process.exit(1);
} else {
  console.log("\n✅ Tất cả các quy tắc critical và luồng đều an toàn!");
  process.exit(0);
}
