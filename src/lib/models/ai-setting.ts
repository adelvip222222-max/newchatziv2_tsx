import { Schema, models, model, type InferSchemaType, type Model } from "mongoose";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/strings";

const aiSettingSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    botId: { type: Schema.Types.ObjectId, ref: "Bot", required: true, index: true },
    aiModelId: { type: Schema.Types.ObjectId, ref: "AiModel", required: false },
    provider: { type: String, default: "openai" },
    model: { type: String, default: () => process.env.DEFAULT_AI_MODEL || "gpt-4o-mini" },
    systemPrompt: { type: String, default: DEFAULT_SYSTEM_PROMPT },
    temperature: { type: Number, default: 0.6, min: 0, max: 2 },
    language: { type: String, default: "auto" },
    languageMode: { type: String, default: "auto" },
    role: { type: String, default: "assistant" },
    tone: { type: String, default: "neutral" },
    tonePreset: { type: String, default: "balanced" },
    warmthLevel: { type: String, default: "balanced" },
    salesStyle: { type: String, default: "consultative" },
    supportStyle: { type: String, default: "helpful" },
    responseLength: { type: String, default: "medium" },
    fallbackMessage: { type: String, default: "" },
    useEmojis: { type: Boolean, default: true },
    emojiStyle: { type: String, default: "light" },
    businessCategory: { type: String, default: "" },
    businessSubcategory: { type: String, default: "" },
    categoryPromptEn: { type: String, default: "" },
    customInstructionsEn: { type: String, default: "" },
    ticketPolicy: { type: Schema.Types.Mixed, default: { requireName: true, requirePhone: true, requireDescription: true } },
    leadPolicy: { type: Schema.Types.Mixed, default: { dedupeByPhone: true, syncFromTickets: true } },
    isEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

aiSettingSchema.index({ tenantId: 1, botId: 1 }, { unique: true });

export type AiSettingDocument = InferSchemaType<typeof aiSettingSchema>;
export const AiSetting =
  (models.AiSetting as Model<AiSettingDocument>) || model("AiSetting", aiSettingSchema);
