import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
