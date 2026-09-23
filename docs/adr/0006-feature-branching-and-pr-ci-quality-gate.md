# Feature Branching and GitHub PR CI Quality Gate

All development must occur on dedicated feature branches (`feat/<slug>`, `fix/<slug>`) branched off latest `main`. Pull Requests target `main` and trigger an automated GitHub Actions CI Quality Gate verifying Prettier formatting, Deep Module boundary rules (`dependency-cruiser`), TypeScript types across Turborepo packages, and build integrity before merging. Direct commits to `main` for feature work are strictly prohibited.
