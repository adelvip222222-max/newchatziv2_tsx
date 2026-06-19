import { Queue } from "bullmq";
import { Message, MessageDelivery } from "@/lib/models";
import { createRedisConnection, formatRedisError } from "@/lib/redis-connection";

const connection = createRedisConnection("outbound-queue", { failFast: true });
const isBuild = process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build";

export const outboundQueue = isBuild ? null as any : new Queue("outbound-messages", { connection: connection as any });

type OutboundMessagePayload = {
  deliveryId: string;
  channelId: string;
  provider: string;
  externalUserId?: string;
  externalThreadId?: string;
  text: string;
  attachments?: unknown[];
};

const retryDelayMs = 60_000;

function outboundJobId(payload: OutboundMessagePayload) {
  return ["outbound", payload.deliveryId, payload.provider]
    .filter(Boolean)
    .join("__")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 180);
}

async function addOutboundJob(payload: OutboundMessagePayload) {
  await outboundQueue.add("send", payload, {
    attempts: 3,
    priority: 1,
    jobId: outboundJobId(payload),
    backoff: { type: "exponential", delay: Number(process.env.OUTBOUND_JOB_BACKOFF_MS || 1000) },
    removeOnComplete: { count: 2000, age: 24 * 60 * 60 },
    removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 }
  });
}

export async function queueOutboundMessage({
  tenantId,
  messageId,
  conversationId,
  channelId,
  provider,
  text,
  attachments,
  externalUserId,
  externalThreadId
}: any) {
  // 1. Create delivery record and mark message as queued before the channel adapter sends it.
  await Message.findOneAndUpdate({ _id: messageId, tenantId }, { deliveryStatus: "queued" });

  const delivery = await MessageDelivery.create({
    tenantId,
    messageId,
    conversationId,
    channelId,
    provider,
    direction: "outgoing",
    status: "queued"
  });

  const jobPayload: OutboundMessagePayload = {
    deliveryId: delivery._id.toString(),
    channelId: channelId.toString(),
    provider,
    externalUserId,
    externalThreadId,
    text,
    attachments
  };

  try {
    await addOutboundJob(jobPayload);
  } catch (error) {
    const errorMessage = formatRedisError(error);
    const nextRetryAt = new Date(Date.now() + retryDelayMs);

    await MessageDelivery.findByIdAndUpdate(delivery._id, {
      errorCode: "QUEUE_UNAVAILABLE",
      errorMessage,
      nextRetryAt,
      metadata: { pendingQueuePayload: jobPayload }
    });

    await Message.findByIdAndUpdate(messageId, { deliveryStatus: "queued" });
    console.error(`[outbound-queue] delivery ${delivery._id.toString()} saved for retry: ${errorMessage}`);

    return { delivery, enqueued: false };
  }

  return { delivery, enqueued: true };
}

export async function requeuePendingOutboundMessages(limit = 100) {
  const pendingDeliveries = await MessageDelivery.find({
    direction: "outgoing",
    status: "queued",
    errorCode: "QUEUE_UNAVAILABLE",
    $or: [{ nextRetryAt: { $lte: new Date() } }, { nextRetryAt: { $exists: false } }]
  })
    .sort({ createdAt: 1 })
    .limit(limit);

  let requeued = 0;
  let failed = 0;

  for (const delivery of pendingDeliveries) {
    const payload = (delivery.metadata as { pendingQueuePayload?: OutboundMessagePayload } | undefined)?.pendingQueuePayload;

    if (!payload) {
      failed += 1;
      continue;
    }

    try {
      await addOutboundJob(payload);
      await MessageDelivery.findByIdAndUpdate(delivery._id, {
        $unset: { errorCode: "", errorMessage: "", nextRetryAt: "", "metadata.pendingQueuePayload": "" }
      });
      requeued += 1;
    } catch (error) {
      failed += 1;
      await MessageDelivery.findByIdAndUpdate(delivery._id, {
        errorMessage: formatRedisError(error),
        nextRetryAt: new Date(Date.now() + retryDelayMs)
      });
    }
  }

  return { scanned: pendingDeliveries.length, requeued, failed };
}

export async function closeOutboundQueue() {
  if (outboundQueue) {
    await outboundQueue.close().catch(() => undefined);
  }

  await connection.quit().catch(() => undefined);
}
