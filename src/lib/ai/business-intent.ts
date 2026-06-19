export type BusinessIntent =
  | "identity"
  | "services"
  | "products"
  | "prices"
  | "offers"
  | "contact"
  | "location"
  | "hours"
  | "appointment"
  | "doctor"
  | "faq"
  | "support"
  | "complaint"
  | "business"
  | "out_of_scope"
  | "unknown";

export function normalizeIntentText(input: string) {
  return String(input || "")
    .toLowerCase()
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectBusinessIntent(message: string): BusinessIntent {
  const text = normalizeIntentText(message);
  if (!text) return "unknown";

  if (hasAny(text, [/(^|\s)(من انت|مين انت|انت مين|من انتم|مين انتم|عرفني بنفسك|who are you|what are you|about you)(\s|$)/i])) return "identity";
  if (hasAny(text, [/(خدمات|خدمه|بتقدموا ايه|تقدمون|ماهي الخدمات|ما هي الخدمات|services|service list|what do you offer)/i])) return "services";
  if (hasAny(text, [/(منتجات|منتج|products|product catalog|catalogue|catalog)/i])) return "products";
  if (hasAny(text, [/(سعر|اسعار|بكام|تكلفه|price|pricing|cost|fees?)/i])) return "prices";
  if (hasAny(text, [/(عرض|عروض|خصم|خصومات|offer|offers|discount|promotion)/i])) return "offers";
  if (hasAny(text, [/(رقم|تليفون|هاتف|واتساب|ايميل|بريد|تواصل|contact|phone|email|whatsapp)/i])) return "contact";
  if (hasAny(text, [/(عنوان|مكان|موقع|فين|اين|location|address|where are you)/i])) return "location";
  if (hasAny(text, [/(مواعيد|ميعاد|ساعات العمل|امتي|متي|hours|working hours|open|close)/i])) return "hours";
  if (hasAny(text, [/(احجز|حجز|موعد|زيارة|booking|book|appointment|reservation)/i])) return "appointment";
  if (hasAny(text, [/(دكتور|طبيب|اطباء|فريق طبي|doctor|doctors|specialist)/i])) return "doctor";
  if (hasAny(text, [/(سؤال|اسئله|faq|frequently asked)/i])) return "faq";
  if (hasAny(text, [/(مشكله|دعم|مساعده|لا يعمل|support|help|issue|problem)/i])) return "support";
  if (hasAny(text, [/(شكوي|شكوى|زعلان|سيء|complaint|complain|bad service)/i])) return "complaint";
  if (hasAny(text, [/(طقس|weather|برمجه|programming|كود|code|حيوان|animals?|اكل|food|سياسه عالميه|news)/i])) return "out_of_scope";

  return "business";
}

export function entityTypesForIntent(intent: BusinessIntent) {
  switch (intent) {
    case "services": return ["service"];
    case "products": return ["product"];
    case "prices": return ["price", "service", "product", "offer"];
    case "offers": return ["offer"];
    case "contact": return ["contact", "branch", "business_info"];
    case "location": return ["branch", "contact", "business_info"];
    case "hours": return ["appointment_rule", "branch", "business_info"];
    case "appointment": return ["appointment_rule", "service", "branch", "contact"];
    case "doctor": return ["doctor", "service"];
    case "faq": return ["faq"];
    case "support": return ["support", "policy", "faq"];
    case "complaint": return ["support", "policy", "contact"];
    case "identity": return ["business_info", "contact", "branch"];
    default: return [];
  }
}

export function isDirectKnowledgeIntent(intent: BusinessIntent) {
  return ["identity", "services", "products", "prices", "offers", "contact", "location", "hours", "appointment", "doctor", "faq"].includes(intent);
}
