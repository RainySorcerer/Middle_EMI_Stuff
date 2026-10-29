"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { buildFacts } from "@/lib/analytics";
import { narrate } from "@/lib/ai";
import { loadRawData, saveAnalysis } from "@/lib/store";

export async function generateAnalysisAction(): Promise<void> {
  const { user } = await requireOnboardedUser();
  const data = loadRawData(user.id);
  if (!data) redirect("/onboarding");

  const facts = buildFacts(data);
  const narrative = await narrate(facts);
  saveAnalysis(user.id, {
    engine: narrative.engine,
    headline: narrative.headline,
    summary: narrative.summary,
    facts,
  });
  revalidatePath("/insights");
  revalidatePath("/dashboard");
  redirect("/insights?fresh=1");
}
