# 01: User Registration Slice

**What to build:** A new user can register by entering their name, email, and password on the `/register` page (designed in `designs/auth.pen`). The form validates inputs with Zod schemas from `@repo/contracts`. On submission, NestJS creates the user with a bcrypt-hashed password via `IUserRepository`, issues HttpOnly session cookies, and sets the authenticated state.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Registration form renders at `/register` matching `designs/auth.pen` specifications.
- [ ] Input validation prevents submission of invalid emails or passwords shorter than 8 characters.
- [ ] Backend `POST /auth/register` rejects duplicate email registrations with a clean 409 Conflict.
- [ ] Password is never stored in plain text (bcrypt hashed with salt rounds >= 10).
- [ ] Successful registration sets HttpOnly `accessToken` and `refreshToken` cookies.
- [ ] Unit tests for `AuthService` pass using mocked `IUserRepository`.
