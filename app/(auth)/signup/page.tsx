import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { isInviteOnly } from "@/lib/invites";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink-900">
        Create your account
      </h1>
      <p className="mt-1.5 text-[14px] text-ink-500">
        {isInviteOnly()
          ? "PaisaPilot is invite-only while we test with real statements."
          : "A two-minute setup, then your first analysis."}
      </p>
      <div className="mt-7">
        <SignupForm inviteOnly={isInviteOnly()} />
      </div>
    </div>
  );
}
