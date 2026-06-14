"use client";

import { useActionState } from "react";
import Link from "next/link";

type Action = (
  prev: unknown,
  formData: FormData,
) => Promise<{ error?: string; info?: string } | undefined>;

export default function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: Action;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl">
            💴
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Okane</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup
              ? "Create your private finance account"
              : "Sign in to your finances"}
          </p>
        </div>

        <form action={formAction} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              className="input"
              placeholder={isSignup ? "At least 8 characters" : "••••••••"}
            />
          </div>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state?.info && (
            <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
              {state.info}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending
              ? "Please wait…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isSignup ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-brand-700">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-brand-700">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
