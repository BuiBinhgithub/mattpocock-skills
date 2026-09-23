Status: ready-for-agent

# Specification: Authentication System

## Problem Statement

Users need a secure and seamless way to register, authenticate, manage their session, and access protected resources within the Management Dashboard without risking token theft or encountering broken sessions during server-side navigation in Next.js.

## Solution

A stateful session architecture utilizing HttpOnly JWT cookies for both Access Tokens and Refresh Tokens issued by NestJS, paired with an edge-compatible Next.js Middleware that inspects cookie sessions for route protection, and a client-side TanStack React Query integration powered by shared `@repo/contracts` Zod schemas.

## User Stories

1. As a new user, I want to create an account with my email, password, and name, so that I can access the management dashboard.
2. As a new user, I want clear validation feedback if my password is less than 8 characters or my email format is invalid, so that I can correct input mistakes immediately.
3. As a registered user, I want to log in using my email and password, so that I can establish an authenticated session.
4. As a registered user, I want my authentication tokens stored in HttpOnly cookies, so that malicious third-party scripts (XSS) cannot steal my credentials.
5. As a registered user, I want my short-lived access token silently refreshed using a refresh token rotation, so that my work is not interrupted by session expirations.
6. As an authenticated user, I want to view my profile details (name, email, member since date) on the dashboard, so that I know which account is active.
7. As an authenticated user, I want to securely log out, so that my authentication cookies are cleared on both the client and server.
8. As an unauthenticated visitor, I want to be redirected to `/login` when trying to access `/dashboard` or any protected route, so that private information remains guarded.
9. As an authenticated user, I want to be redirected automatically to `/dashboard` when visiting `/login` or `/register`, so that I do not re-authenticate unnecessarily.
10. As a user with an expired or invalidated refresh token, I want to be smoothly redirected to `/login` with an informational notice, so that I can re-authenticate cleanly.

## Implementation Decisions

### Modules & Architecture

- **Contracts (`packages/contracts`)**:
  - Expose Zod schemas (`RegisterDtoSchema`, `LoginDtoSchema`, `UserProfileSchema`) and inferred TypeScript types.
  - Act as the single contract between frontend forms and backend controllers.
- **Backend API (`apps/api`)**:
  - `AuthModule` containing `AuthController`, `AuthService`, and Passport `JwtStrategy`.
  - Encapsulate data access inside `IUserRepository` / `PrismaUserRepository` in adherence to ADR 0003. Domain services must never directly touch `PrismaService`.
  - Passwords hashed using `bcrypt` with salt rounds >= 10.
  - Issue two HttpOnly, Secure, SameSite=Lax cookies upon login/register: `accessToken` (15m expiry) and `refreshToken` (7d expiry) in adherence to ADR 0002.
  - Endpoints:
    - `POST /auth/register`: Create user and set session cookies.
    - `POST /auth/login`: Authenticate credentials and set session cookies.
    - `POST /auth/refresh`: Rotate refresh token and issue new session cookies.
    - `POST /auth/logout`: Invalidate refresh token and clear cookies.
    - `GET /auth/me`: Return current user profile protected by `JwtAuthGuard`.
- **Frontend Web (`apps/web`)**:
  - Next.js Edge Middleware (`middleware.ts`) reading `accessToken` / `refreshToken` cookies to guard protected routes (`/dashboard/:path*`).
  - Auth form components built with `react-hook-form` + `@hookform/resolvers/zod` consuming `@repo/contracts`.
  - TanStack React Query hook (`useAuth`, `useLogin`, `useRegister`, `useLogout`) managing server state and cache invalidation.

## Testing Decisions

- **Test Seam 1: Domain & Service Seam**:
  - Unit tests for `AuthService` against mock `IUserRepository` (verifying password comparison, token generation, user duplication handling) without touching real database.
- **Test Seam 2: HTTP Controller Seam**:
  - Integration tests for `AuthController` verifying response status codes and `Set-Cookie` header attributes (HttpOnly, Secure, SameSite).
- **Test Seam 3: Contract Validation Seam**:
  - Validate that `@repo/contracts` Zod schemas reject invalid emails and short passwords.
- **Test Seam 4: Next.js Edge Middleware Seam**:
  - Test redirection logic for authenticated vs unauthenticated cookie states.

## Out of Scope

- Third-party OAuth (Google, GitHub login) - reserved for future epic.
- Two-Factor Authentication (2FA / TOTP) - reserved for future security spec.
- Forgot Password / Password Reset via Email - reserved for future email service spec.
- Role-based Access Control (RBAC) admin dashboards - reserved for tenant spec.

## Further Notes

- All code must pass `pnpm run lint:boundaries` and `turbo run typecheck` before commit.
- Mock data in unit tests must avoid `as` assertions in favor of type-safe fixtures or `@total-typescript/shoehorn`.
