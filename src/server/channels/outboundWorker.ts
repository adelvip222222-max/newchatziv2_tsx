import { Worker } from "bullmq";
import { connectToDatabase } from "@/lib/mongodb";
import { MessageDelivery, Channel, Message } from "@/lib/models";
import { getAdapter } from "./registry";
import { initializeAdapters } from "./providers";
import { createRedisConnection } from "@/lib/redis-connection";
import { recordFailedJob } from "@/lib/job-monitoring";
import { logger } from "@/lib/logger";
import { publishRealtimeEvent } from "@/lib/realtime";

const connection = createRedisConnection("outbound-worker");

// Initialize providers so registry is populated
initializeAdapters();

export const outboundWorker = new Worker(
  "outbound-messages",
  async (job) => {
    await connectToDatabase();
    
    const { deliveryId, channelId, provider, externalUserId, externalThreadId, text, attachments } = job.data;
    
    logger.info("job.started", { queueName: "outbound-messages", jobId: job.id, deliveryId });

    const delivery = await MessageDelivery.findById(deliveryId);
    if (!delivery) throw new Error("Delivery record not found");

    const channel = await Channel.findOne({ _id: channelId, tenantId: delivery.tenantId });
    if (!channel) {
      delivery.status = "canceled";
      delivery.errorMessage = "Channel deleted";
      await delivery.save();
      return;
    }

    delivery.status = "sending";
    delivery.attempts += 1;
    delivery.lastAttemptAt = new Date();
    await delivery.save();

    const adapter = getAdapter(provider);
    
    const result = await adapter.sendMessage({
      channel,
      externalUserId,
      externalThreadId,
      text,
      attachments
    });

    if (result.success) {
      delivery.status = "sent";
      delivery.externalMessageId = result.externalMessageId;
      await delivery.save();

      const sentAt = new Date();
      await Message.findOneAndUpdate(
        { _id: delivery.messageId, tenantId: delivery.tenantId },
        {
          deliveryStatus: "sent",
          externalMessageId: result.externalMessageId,
          $set: {
            "metadata.trace.outboundSentAt": sentAt.toISOString(),
            "metadata.trace.outboundLatencyMs": delivery.createdAt
              ? sentAt.getTime() - new Date(delivery.createdAt).getTime()
              : undefined,
          },
        }
      );

      await publishRealtimeEvent(delivery.tenantId.toString(), "delivery.updated", {
        messageId: delivery.messageId.toString(),
        deliveryId: delivery._id.toString(),
        status: "sent",
        provider,
        externalMessageId: result.externalMessageId,
        sentAt: sentAt.toISOString(),
      });
      logger.info("outbound.sent", {
        deliveryId: delivery._id.toString(),
        tenantId: delivery.tenantId?.toString(),
        provider,
        externalMessageId: result.externalMessageId
      });
    } else {
      delivery.status = "failed";
      delivery.errorMessage = result.error?.message || (typeof result.error === 'string' ? result.error : JSON.stringify(result.error)) || "Unknown error";
      await delivery.save();

      await Message.findOneAndUpdate({ _id: delivery.messageId, tenantId: delivery.tenantId }, { deliveryStatus: "failed", $set: { "metadata.trace.outboundFailedAt": new Date().toISOString() } });

      throw new Error(delivery.errorMessage || "Unknown error"); // Trigger BullMQ retry
    }
  },
  { connection: connection as any, concurrency: Number(process.env.OUTBOUND_WORKER_CONCURRENCY || 8) }
);

outboundWorker.on("failed", (job, err) => {
  void recordFailedJob("outbound-messages", job, err);
});
