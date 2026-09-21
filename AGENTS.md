# AGENTS.md

Welcome to the **Management Dashboard** full-stack repository. This document defines the engineering standards, architecture, and skill workflows for AI coding agents.

## Architecture & Tech Stack

- **Monorepo**: Turborepo with pnpm workspaces.
  - `apps/web`: Next.js (App Router), TanStack React Query, React Hook Form, shadcn/ui, Tailwind CSS.
  - `apps/api`: NestJS, PostgreSQL, Prisma ORM, Model-Repository pattern, HttpOnly Cookie JWT authentication.
  - `packages/contracts`: Shared schemas, DTOs, and generated Orval React Query client.
- **Data Persistence**: Prisma encapsulated inside NestJS Custom Repositories. Domain services must never inject `PrismaService` directly.
- **Authentication**: Stateful session over HttpOnly JWT cookies with refresh token rotation. Supported in Next.js SSR middleware.

## Agent skills

### Issue tracker

Local markdown files in `.scratch/`. See [issue-tracker.md](file:///Users/buibinh/Desktop/mattpocock-skills/docs/agents/issue-tracker.md).

### Triage labels

Standard canonical triage labels (`needs-triage`, `ready-for-agent`, etc.). See [triage-labels.md](file:///Users/buibinh/Desktop/mattpocock-skills/docs/agents/triage-labels.md).

### Domain docs

Single-context repository layout (`CONTEXT.md` at root + `docs/adr/`). See [domain.md](file:///Users/buibinh/Desktop/mattpocock-skills/docs/agents/domain.md).

## Operational Workflow

When developing in this repo, strictly follow Matt Pocock's skill lifecycle:

1. **Strategic Planning (Epic / Large Decision)**:
   - Call `/grill-with-docs` to sharpen the idea, update [CONTEXT.md](file:///Users/buibinh/Desktop/mattpocock-skills/CONTEXT.md), and record ADRs in `docs/adr/`.
   - Call `/wayfinder` if work spans multiple sessions with fog of war.
2. **Specification & Breakdown**:
   - Call `/to-spec` to generate `.scratch/<feature>/spec.md`.
   - Call `/to-tickets` to split the spec into `.scratch/<feature>/issues/<NN>-<slug>.md`.
3. **Architecture & Module Design**:
   - Call `/codebase-design` to design deep modules, seams, and minimal interfaces.
4. **Execution with TDD**:
   - Call `/tdd` to follow the Red-Green-Refactor loop.
   - Use `@total-typescript/shoehorn` (`/migrate-to-shoehorn`) for mock data instead of `as` type assertions.
5. **Quality Gate & Review**:
   - Verify code against pre-commit linters and tests.
   - Run `/code-review` (evaluating both Standards and Spec in parallel).
   - Generate PR descriptions with `/pr`.
