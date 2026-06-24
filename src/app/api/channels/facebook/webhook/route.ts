import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Channel } from "@/lib/models";
import { safeJsonError } from "@/lib/api-security";
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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  await connectToDatabase();
  const channel = await Channel.findOne({
    type: { $in: ["facebook", "instagram"] },
    "config.verifyToken": token,
    isActive: true
  });

  if (!channel && token !== process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    const ip = getWebhookIp(request);

    try {
      await checkRateLimit(`webhook:facebook:${ip}`, {
        limit: WEBHOOK_RATE_LIMIT,
        windowMs: WEBHOOK_RATE_WINDOW_MS,
      });
    } catch {
      logger.warn("webhook.rate_limit_exceeded", { provider: "facebook", ip });
      return new NextResponse("Too Many Requests", { status: 429 });
    }

    const rawBody = await request.text();
    let payload: Record<string, any>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const provider = payload.object === "instagram" ? "instagram" : "facebook";

    const result = await enqueueInboundWebhook({
      provider,
      request,
      payload,
      rawBody
    });

    if (!result.ok) {
      const status = result.status || 400;
      return new NextResponse(result.error || "Bad Request", { status });
    }

    return new NextResponse("EVENT_RECEIVED", { status: 200 });
  } catch (error) {
    return safeJsonError(error, "Webhook processing failed.", 400);
  }
}
