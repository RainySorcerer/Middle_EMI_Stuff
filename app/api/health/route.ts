import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Liveness/readiness probe for hosting platforms and uptime monitors.
 * Unauthenticated on purpose: it exposes no user data, only that the process
 * can reach its database file.
 */
export async function GET() {
  try {
    getDb().prepare("SELECT 1 AS ok").get();
    return NextResponse.json(
      { ok: true, service: "paisapilot", uptimeSeconds: Math.round(process.uptime()) },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "paisapilot" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
}
