import type { AnalysisFacts } from "./domain";
import { geminiConfigured, geminiJson } from "./gemini";
import { inrP } from "./money";

export interface Narrative {
  engine: string;
  headline: string;
  summary: string;
}

const SYSTEM = `You are PaisaPilot, an educational personal-finance analyst for India.
You receive pre-computed facts about one person's money. Rules:
- Use ONLY the numbers in the facts. Never invent or recalculate amounts.
- Be calm, specific and brief. No hype, no guarantees.
- Never recommend specific stocks, mutual funds, insurers or credit cards.
- Never claim to move money, apply for credit, or give tax filing advice.
- Amounts are in Indian rupees. Use lakh notation only when it helps.
Return strict JSON: {"headline": "max 7 words", "summary": "2 sentences, max 55 words"}.`;

export async function narrate(facts: AnalysisFacts): Promise<Narrative> {
  const compact = compactFacts(facts);

  if (geminiConfigured()) {
    try {
      const parsed = await geminiJson<{ headline?: string; summary?: string }>({
        system: SYSTEM,
        parts: [{ text: JSON.stringify(compact) }],
        schema: {
          type: "OBJECT",
          properties: { headline: { type: "STRING" }, summary: { type: "STRING" } },
          required: ["headline", "summary"],
          propertyOrdering: ["headline", "summary"],
        },
        maxOutputTokens: 400,
        timeoutMs: 12_000,
      });
      if (parsed?.headline && parsed?.summary) {
        return {
          engine: "Gemini",
          headline: String(parsed.headline).slice(0, 90),
          summary: String(parsed.summary).slice(0, 420),
        };
      }
    } catch {
      // fall through to the next provider, then the local analyst
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    try {
      const response = await withTimeout((signal) =>
        fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5",
            max_tokens: 400,
            system: SYSTEM,
            messages: [{ role: "user", content: JSON.stringify(compact) }],
          }),
        })
      );
      if (response.ok) {
        const data = (await response.json()) as {
          content?: { type: string; text?: string }[];
        };
        const text = data.content?.find((part) => part.type === "text")?.text;
        const parsed = parseJson(text);
        if (parsed?.headline && parsed?.summary) {
          return {
            engine: "Claude",
            headline: String(parsed.headline).slice(0, 90),
            summary: String(parsed.summary).slice(0, 420),
          };
        }
      }
    } catch {
      // fall through to the local analyst
    }
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await withTimeout((signal) =>
        fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal,
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
            max_tokens: 400,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: JSON.stringify(compact) },
            ],
          }),
        })
      );
      if (response.ok) {
        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const parsed = parseJson(data.choices?.[0]?.message?.content);
        if (parsed?.headline && parsed?.summary) {
          return {
            engine: "OpenAI",
            headline: String(parsed.headline).slice(0, 90),
            summary: String(parsed.summary).slice(0, 420),
          };
        }
      }
    } catch {
      // fall through to the local analyst
    }
  }

  return localNarrative(facts);
}

function compactFacts(facts: AnalysisFacts) {
  return {
    monthly_income_rupees: Math.round(facts.monthlyIncomePaise / 100),
    monthly_spend_rupees: Math.round(facts.monthlySpendPaise / 100),
    monthly_surplus_rupees: Math.round(facts.monthlySurplusPaise / 100),
    savings_rate_percent: Number(facts.savingsRate.toFixed(1)),
    health_score: facts.healthScore,
    credit_utilization_percent:
      facts.cards.limitPaise > 0 ? Number(facts.cards.utilization.toFixed(1)) : null,
    credit_outstanding_rupees: Math.round(facts.cards.outstandingPaise / 100),
    emi_ratio_percent: Number(facts.emiRatio.toFixed(1)),
    emergency_months: Number(facts.emergencyMonths.toFixed(1)),
    recurring_payments_per_month_rupees: Math.round(facts.recurringTotalPaise / 100),
    top_categories: facts.categoryTotals.slice(0, 5).map((item) => ({
      name: item.category,
      rupees_90d: Math.round(item.paise / 100),
      share_percent: Number(item.share.toFixed(1)),
    })),
    recurring_merchants: facts.recurring.slice(0, 5).map((item) => item.merchant),
    goal: facts.goal
      ? {
          label: facts.goal.label,
          target_rupees: Math.round(facts.goal.amountPaise / 100),
          months: facts.goal.months,
          required_monthly_rupees: Math.round(facts.goal.requiredMonthlyPaise / 100),
          feasible: facts.goal.feasible,
        }
      : null,
    priority_findings: facts.insights.slice(0, 3).map((insight) => ({
      title: insight.title,
      impact_rupees: Math.round(insight.impactPaise / 100),
    })),
  };
}

function localNarrative(facts: AnalysisFacts): Narrative {
  if (!facts.hasData) {
    return {
      engine: "PaisaPilot rules",
      headline: "Import once, see the whole month",
      summary:
        "Upload a bank or UPI statement and PaisaPilot groups your spending, finds repeating payments and scores your month. No bank login is needed.",
    };
  }

  const top = facts.insights[0];
  const scoreBand =
    facts.healthScore >= 75 ? "solid" : facts.healthScore >= 50 ? "workable" : "under pressure";

  const parts: string[] = [];
  parts.push(
    facts.monthlyIncomePaise > 0
      ? `You keep ${Math.max(0, Math.round(facts.savingsRate))}% of income (${inrP(
          facts.monthlySurplusPaise
        )} a month) and your financial score is ${facts.healthScore}/100 — ${scoreBand}.`
      : `Your financial score is ${facts.healthScore}/100 — ${scoreBand}. Add your income in Settings for a sharper read.`
  );
  if (facts.categoryTotals.length > 0) {
    const lead = facts.categoryTotals[0];
    parts.push(
      `${lead.category} is the largest tracked category at ${inrP(lead.paise)} over 90 days.`
    );
  }
  if (top) parts.push(top.title + ".");

  return {
    engine: "PaisaPilot rules",
    headline: facts.insights[0]?.title ?? `Your month scores ${facts.healthScore}/100`,
    summary: parts.join(" ").slice(0, 420),
  };
}

function parseJson(value: unknown): { headline?: string; summary?: string } | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function withTimeout(
  run: (signal: AbortSignal) => Promise<Response>
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
