import { NextResponse } from "next/server";
import { getCurrentUser, getProfile } from "@/lib/auth";
import { getLatestAnalysis, listAccounts, listTransactions } from "@/lib/store";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const profile = getProfile(user.id);
  const accounts = listAccounts(user.id);
  const transactions = listTransactions(user.id, { limit: 5000 });
  const analysis = getLatestAnalysis(user.id);

  const payload = {
    exported_at: new Date().toISOString(),
    user: { name: user.name, email: user.email, created_at: user.created_at },
    profile,
    accounts,
    transactions,
    latest_analysis: analysis
      ? {
          created_at: analysis.created_at,
          engine: analysis.engine,
          headline: analysis.headline,
          summary: analysis.summary,
          facts: JSON.parse(analysis.payload_json),
        }
      : null,
    note: "Amounts are stored in paise (1 rupee = 100 paise).",
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="paisapilot-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
