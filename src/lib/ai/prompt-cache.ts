import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const PROMPT_CACHE_TTL_SECONDS = Number(process.env.AI_PROMPT_CACHE_TTL_SECONDS || 300);
const PROMPT_CACHE_PREFIX = "cache:prompt:";

/**
 * Generates a stable cache key for the system prompt.
 * Key includes tenantId, botId, and a settings hash to invalidate on config changes.
 */
export function buildPromptCacheKey(tenantId: string, botId: string, settingsHash: string): string {
  return `${PROMPT_CACHE_PREFIX}${tenantId}:${botId}:${settingsHash}`;
}

/**
 * Produces a lightweight hash of AiSetting fields that affect the system prompt.
 * Changes to tone, language, systemPrompt, etc. will produce a different hash,
 * automatically invalidating the cached prompt.
 */
export function hashSettingsForPrompt(setting: {
  systemPrompt?: string;
  language?: string;
  tone?: string;
  tonePreset?: string;
  role?: string;
  responseLength?: string;
  useEmojis?: boolean;
  salesStyle?: string;
  supportStyle?: string;
  businessCategory?: string;
  categoryPromptEn?: string;
  customInstructionsEn?: string;
} | null): string {
  if (!setting) return "default";
  const relevant = [
    setting.systemPrompt?.slice(0, 64) ?? "",
    setting.language ?? "",
    setting.tone ?? "",
    setting.tonePreset ?? "",
    setting.role ?? "",
    setting.responseLength ?? "",
    String(setting.useEmojis ?? true),
    setting.salesStyle ?? "",
    setting.supportStyle ?? "",
    setting.businessCategory ?? "",
    setting.categoryPromptEn?.slice(0, 32) ?? "",
    setting.customInstructionsEn?.slice(0, 32) ?? "",
  ].join("|");

  let hash = 0;
  for (let i = 0; i < relevant.length; i++) {
    hash = Math.imul(31, hash) + relevant.charCodeAt(i) | 0;
  }
  return (hash >>> 0).toString(16);
}

export async function getCachedSystemPrompt(cacheKey: string): Promise<string | null> {
  try {
    return await redis.get(cacheKey);
  } catch (error) {
    logger.warn("prompt_cache.get_failed", {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedSystemPrompt(cacheKey: string, prompt: string): Promise<void> {
  try {
    await redis.set(cacheKey, prompt, "EX", PROMPT_CACHE_TTL_SECONDS);
  } catch (error) {
    logger.warn("prompt_cache.set_failed", {
      cacheKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
