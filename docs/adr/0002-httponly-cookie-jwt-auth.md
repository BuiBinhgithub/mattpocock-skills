# HttpOnly Cookie JWT Authentication

Authentication uses HttpOnly cookies containing short-lived Access Tokens and long-lived Refresh Tokens issued by NestJS. This protects against XSS token leakage, natively supports Next.js App Router Server Components and Edge Middleware session checks without localStorage workarounds, and maintains secure refresh rotation.
