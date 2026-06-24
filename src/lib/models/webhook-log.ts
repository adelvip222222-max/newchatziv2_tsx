import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const WEBHOOK_LOG_TTL_SECONDS =
  Number(process.env.WEBHOOK_LOG_TTL_DAYS || 30) * 86400;

const webhookLogSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false, index: true },
    botId: { type: Schema.Types.ObjectId, ref: "Bot", required: false, index: true },
    channel: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["received", "success", "error"], default: "received" },
    error: { type: String, default: "" }
  },
  { timestamps: true }
);

webhookLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: WEBHOOK_LOG_TTL_SECONDS });

export type WebhookLogDocument = InferSchemaType<typeof webhookLogSchema>;
export const WebhookLog =
  (models.WebhookLog as Model<WebhookLogDocument>) || model("WebhookLog", webhookLogSchema);
