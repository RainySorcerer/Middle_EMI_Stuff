import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900">Welcome back</h1>
      <p className="mt-1.5 text-[14px] text-ink-500">
        Sign in to see this month&apos;s read on your money.
      </p>
      <div className="mt-7">
        <LoginForm />
      </div>
    </div>
  );
}
