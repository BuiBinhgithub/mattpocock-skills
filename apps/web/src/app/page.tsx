import Link from "next/link";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            Production Ready Fullstack Architecture
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Management Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base max-w-lg mx-auto">
            Full-stack Turborepo with Next.js App Router, NestJS
            Model-Repository, HttpOnly Cookie JWT authentication, and Matt
            Pocock skills.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="px-8 shadow-sm">
              Sign In
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="outline" size="lg" className="px-8">
              Create Account
            </Button>
          </Link>
        </div>

        {/* System Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-6">
          <Card>
            <CardHeader className="p-5">
              <CardTitle className="text-base">
                Next.js Frontend (apps/web)
              </CardTitle>
              <CardDescription className="text-xs">
                App Router with Edge Middleware session checking, React Hook
                Form, TanStack React Query, and Tailwind CSS.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="p-5">
              <CardTitle className="text-base">
                NestJS Backend (apps/api)
              </CardTitle>
              <CardDescription className="text-xs">
                Prisma encapsulated in custom Repositories, HttpOnly JWT
                cookies, refresh token rotation, and Swagger docs.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="pt-4 text-xs text-slate-400 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <span>Contract: @repo/contracts</span>
          <Link
            href="/dashboard"
            className="hover:text-slate-600 dark:hover:text-slate-200 underline"
          >
            Go to Protected Dashboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
