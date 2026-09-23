import { RegisterDto } from "@repo/contracts";

export default function Home() {
  const sampleUser: Partial<RegisterDto> = {
    name: "Admin User",
    email: "admin@example.com",
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="max-w-2xl w-full border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 bg-white dark:bg-neutral-900 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Management Dashboard
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          Full-stack Turborepo monorepo powered by Next.js, NestJS, and Matt
          Pocock skills.
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <h3 className="font-semibold mb-1">Frontend (apps/web)</h3>
            <ul className="text-neutral-600 dark:text-neutral-400 space-y-1">
              <li>• Next.js 15 App Router</li>
              <li>• TanStack React Query v5</li>
              <li>• React Hook Form + Zod</li>
              <li>• Tailwind CSS</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-neutral-100 dark:bg-neutral-800">
            <h3 className="font-semibold mb-1">Backend (apps/api)</h3>
            <ul className="text-neutral-600 dark:text-neutral-400 space-y-1">
              <li>• NestJS Model-Repository</li>
              <li>• PostgreSQL + Prisma ORM</li>
              <li>• HttpOnly Cookie JWT Auth</li>
              <li>• Swagger OpenAPI Docs</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4 flex justify-between items-center text-xs text-neutral-500">
          <span>Type-safe Contract: @repo/contracts</span>
          <span>
            Sample: {sampleUser.name} ({sampleUser.email})
          </span>
        </div>
      </div>
    </main>
  );
}
