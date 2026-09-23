# 03: Route Protection and Dashboard Profile Slice

**What to build:** Next.js Edge Middleware (`middleware.ts`) guards `/dashboard` by inspecting session cookies, redirecting unauthenticated visitors to `/login`. Once authenticated, the `/dashboard` page (matching `designs/auth.pen`) fetches the user profile from `GET /auth/me` (guarded by NestJS `JwtAuthGuard`) and displays user name, email, and session metrics.

**Blocked by:** 02: User Login and Session Cookie Slice

**Status:** ready-for-agent

- [ ] NestJS provides `GET /auth/me` protected by `JwtAuthGuard`, extracting user ID from JWT payload.
- [ ] Next.js Edge Middleware intercepts `/dashboard/:path*`, redirecting unauthenticated requests to `/login`.
- [ ] Next.js Edge Middleware intercepts `/login` and `/register`, redirecting already-authenticated requests to `/dashboard`.
- [ ] `/dashboard` page displays user profile information matching `designs/auth.pen`.
