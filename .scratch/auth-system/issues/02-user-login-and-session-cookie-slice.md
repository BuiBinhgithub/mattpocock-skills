# 02: User Login and Session Cookie Slice

**What to build:** An existing user can log in via `/login` (matching `designs/auth.pen`) with valid credentials. NestJS validates the password hash, issues HttpOnly `accessToken` (15m) and `refreshToken` (7d) cookies with Secure and SameSite flags, and the Next.js frontend updates its authentication cache via React Query.

**Blocked by:** 01: User Registration Slice

**Status:** ready-for-agent

- [ ] Login form renders at `/login` matching `designs/auth.pen` specifications.
- [ ] Backend `POST /auth/login` checks credentials and returns 401 Unauthorized for invalid combinations.
- [ ] Successful login emits `Set-Cookie` headers for `accessToken` and `refreshToken` with `HttpOnly`, `Path=/`, `SameSite=Lax`.
- [ ] Client React Query cache invalidates and transitions to authenticated state upon successful login.
- [ ] Integration tests verify response status and cookie flags.
