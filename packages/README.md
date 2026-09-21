# Packages Architecture: Deep Modules

Every package under `packages/` is a **Deep Module** (a lot of behavior behind a small, clean surface area).

## Package Layout

```
packages/
  <name>/
    index.ts        ← public entry point. Import this from outside.
    client.ts       ← optional additional entry point.
    lib/            ← implementation internals: hidden from outside.
    tests/          ← package tests & fixtures (private).
```

## The Four Boundary Rules

1. **Entry-point boundary**: Outsiders (apps or other packages) may import **only** a package's root entry-point files (`index.ts`, `client.ts`), never anything inside its subfolders (`lib/`, etc.).
2. **Intra-package freedom**: Files inside the same package may import each other freely.
3. **Tests through entry points**: Test files (`tests/`) must exercise the package through its public entry points, never by deep-importing internal subfolders.
4. **No circular dependencies**: Dependency cycles between files or packages are strictly forbidden.

## Avoid Barrel Files

Do not funnel everything through a massive `index.ts` barrel file that re-exports entire subtrees. Instead, expose clear, distinct entry points (e.g. `index.ts`, `server.ts`, `client.ts`).

## Verification

Run the boundary check via:

```bash
pnpm run lint:boundaries
```
