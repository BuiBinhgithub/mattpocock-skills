# Project Context

Architecture and domain definitions for the Fullstack Management Dashboard (Next.js + NestJS).

## Language

**Repository**:
A domain-level abstraction layer that encapsulates database operations (via Prisma) behind interfaces in NestJS.
_Avoid_: DAO, database helper, query service

**Contract**:
The single source of truth for DTOs, types, and API endpoint schemas shared between `apps/api` and `apps/web`.
_Avoid_: API payload, raw interface, ad-hoc type

**Session**:
The client's authenticated state represented and maintained by HttpOnly JWT cookies (Access Token & Refresh Token).
_Avoid_: LocalStorage token, bearer token in storage

**Deep Module**:
A module with a small, clean surface area that hides complex internal logic and data access details.
_Avoid_: Shallow wrapper, passthrough service

**Local Markdown Tracker**:
A file-based issue and decision tracking system stored in `.scratch/`.
_Avoid_: In-memory task list, scratchpad

**Quality Gate**:
An automated pre-commit barrier that prevents code containing lint errors, broken types, or failing unit tests from being committed.
_Avoid_: Manual check, optional linting
