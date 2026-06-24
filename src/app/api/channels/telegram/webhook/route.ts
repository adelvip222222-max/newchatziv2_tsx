import { NextRequest, NextResponse } from "next/server";
import { enqueueInboundWebhook } from "@/server/channels/webhookIngress";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const WEBHOOK_RATE_LIMIT = Number(process.env.WEBHOOK_RATE_LIMIT || 600);
const WEBHOOK_RATE_WINDOW_MS = Number(process.env.WEBHOOK_RATE_WINDOW_MS || 60_000);

function getWebhookIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() || "unknown";
  return "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const ip = getWebhookIp(request);

    try {
      await checkRateLimit(`webhook:telegram:${ip}`, {
        limit: WEBHOOK_RATE_LIMIT,
        windowMs: WEBHOOK_RATE_WINDOW_MS,
      });
    } catch {
      logger.warn("webhook.rate_limit_exceeded", { provider: "telegram", ip });
      // Return 200 to Telegram to prevent infinite retries on our side
      return NextResponse.json({ ok: true });
    }

    const payload = await request.json();

    const result = await enqueueInboundWebhook({
      provider: "telegram",
      request,
      payload
    });

    if (!result.ok) {
      logger.warn("telegram.webhook_enqueue_error", { error: result.error });
      return NextResponse.json({ error: result.error }, { status: result.status || 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("telegram.webhook_internal_error", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return 200 to Telegram to prevent retries for non-recoverable errors
    return NextResponse.json({ ok: true, error: "Internal error handled" });
  }
}
