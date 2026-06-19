import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";

const aiModelSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: false, index: true },
    name: { type: String, required: true, trim: true },
    provider: { type: String, enum: ["openai", "openai-compatible", "google-gemini"], default: "openai" },
    model: { type: String, required: true, trim: true },
    apiKeyEncrypted: { type: String, default: "" },
    baseUrl: { type: String, default: "" },
    qualityScore: { type: Number, default: 70, min: 0, max: 100 },
    speedScore: { type: Number, default: 70, min: 0, max: 100 },
    costScore: { type: Number, default: 70, min: 0, max: 100 },
    costInputPer1M: { type: Number, default: 0, min: 0 },
    costOutputPer1M: { type: Number, default: 0, min: 0 },
    averageLatencyMs: { type: Number, default: 0, min: 0 },
    recommendedFor: [{ type: String, trim: true }],
    planTier: { type: String, default: "all" },
    sortOrder: { type: Number, default: 0 },
    isBestQuality: { type: Boolean, default: false },
    isBestCost: { type: Boolean, default: false },
    isBestSpeed: { type: Boolean, default: false },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

aiModelSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export type AiModelDocument = InferSchemaType<typeof aiModelSchema>;
export const AiModel = (models.AiModel as Model<AiModelDocument>) || model("AiModel", aiModelSchema);
