# Prisma with Repository Pattern in NestJS

Data persistence in NestJS uses Prisma ORM encapsulated inside explicit Repository classes. Domain services depend on repository interfaces via NestJS Dependency Injection rather than calling `PrismaService` directly. This decouples business logic from the database client, simplifies unit testing via mock repositories, and adheres to the deep module design principles.
