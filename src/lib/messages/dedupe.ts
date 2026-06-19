import crypto from "crypto";

export function normalizeMessageText(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .slice(0, 1000);
}

export function roundTimestampBucket(value: Date | string | number | undefined, bucketMs = 10_000) {
  const time = value ? new Date(value).getTime() : Date.now();
  return Math.floor((Number.isFinite(time) ? time : Date.now()) / bucketMs) * bucketMs;
}

function looksLikeGeneratedTimestampId(value: string) {
  if (!/^\d{12,14}$/.test(value)) return false;
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return false;
  const earliest = new Date("2020-01-01T00:00:00Z").getTime();
  const latest = Date.now() + 24 * 60 * 60 * 1000;
  return timestamp >= earliest && timestamp <= latest;
}

export function buildMessageDedupeKey(input: {
  tenantId: string;
  provider?: string;
  externalUserId?: string;
  externalMessageId?: string;
  text?: string;
  timestamp?: Date | string | number;
  direction?: string;
}) {
  const externalMessageId = String(input.externalMessageId || "").trim();
  if (externalMessageId && !looksLikeGeneratedTimestampId(externalMessageId)) {
    return ["external", input.tenantId, input.provider || "unknown", externalMessageId].join(":");
  }

  const source = [
    input.tenantId,
    input.provider || "unknown",
    input.externalUserId || "unknown",
    input.direction || "incoming",
    normalizeMessageText(input.text || ""),
    roundTimestampBucket(input.timestamp),
  ].join("|");

  return `fingerprint:${crypto.createHash("sha256").update(source).digest("hex")}`;
}
