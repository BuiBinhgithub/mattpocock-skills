# Local Markdown Issue Tracker and Git Guardrails

We use a local markdown issue tracker stored in `.scratch/` for task tracking, decision mapping (`wayfinder`), and ticket decomposition (`to-tickets`). To ensure development safety when collaborating with autonomous coding agents, we enforce pre-commit validation hooks (Husky, lint-staged, Prettier, ESLint, TypeScript check) and activate Git guardrails to block destructive git operations (force pushes, hard resets, branch deletion).
