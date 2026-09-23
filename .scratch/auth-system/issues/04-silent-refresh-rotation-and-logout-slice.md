# 04: Silent Refresh Rotation and Logout Slice

**What to build:** Silent token refresh rotation via `POST /auth/refresh` using the HttpOnly `refreshToken` cookie to issue a new `accessToken` and rotated `refreshToken`. A secure logout action via `POST /auth/logout` that clears both cookies and redirects the user to `/login`.

**Blocked by:** 03: Route Protection and Dashboard Profile Slice

**Status:** ready-for-agent

- [ ] NestJS `POST /auth/refresh` validates the refresh token, revokes old refresh token, and issues rotated cookies.
- [ ] If refresh token is expired or invalid, backend returns 401 and frontend redirects user to `/login`.
- [ ] Next.js client intercepts 401 responses and triggers silent refresh automatically.
- [ ] `POST /auth/logout` clears both `accessToken` and `refreshToken` cookies with `maxAge: 0`.
- [ ] Clicking "Sign Out" in the dashboard clears local React Query state and routes user to `/login`.
