"use client";

import { useRouter } from "next/navigation";
import { useCurrentUser, useLogout } from "../../hooks/use-auth";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/ui/card";

export default function DashboardPage() {
  const router = useRouter();
  const { data: user, isLoading, isError } = useCurrentUser();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-lg tracking-tight">
              Management Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-xs text-slate-500 font-mono hidden sm:inline-block">
                {user.email}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
              {logoutMutation.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {isLoading && (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading session profile...
          </div>
        )}

        {isError && (
          <div className="p-6 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Unable to load user profile. Please sign in again.
          </div>
        )}

        {user && (
          <>
            {/* User Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                    Active Session
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">
                      User ID
                    </span>
                    <span className="text-sm font-mono font-medium text-slate-800 dark:text-slate-200 truncate block">
                      {user.id}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">
                      Member since
                    </span>
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">
                      Session Security
                    </span>
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 block">
                      HttpOnly Cookie JWT
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Architecture Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Security & Authentication Flow
                  </CardTitle>
                  <CardDescription>
                    Stateful session managed via HttpOnly cookies with automatic
                    refresh rotation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    • <strong>Access Token</strong>: 15-minute validity stored
                    in HttpOnly cookie.
                  </p>
                  <p>
                    • <strong>Refresh Token</strong>: 7-day validity with silent
                    token rotation.
                  </p>
                  <p>
                    • <strong>Edge Middleware</strong>: Server-side route
                    verification on every navigation.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Decoupled Architecture
                  </CardTitle>
                  <CardDescription>
                    Adheres strictly to Model-Repository pattern and Deep
                    Modules.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p>
                    • <strong>Domain Seam</strong>: NestJS AuthService depends
                    on IUserRepository.
                  </p>
                  <p>
                    • <strong>Prisma Encapsulation</strong>: Direct Prisma
                    queries isolated inside Repository.
                  </p>
                  <p>
                    • <strong>Shared Contract</strong>: Type-safe Zod DTOs via
                    @repo/contracts.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
