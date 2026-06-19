import categories from "@/config/business-categories.json";

export type BusinessCategoryItem = {
  id: string;
  name: { ar: string; en: string };
  subcategories: Array<{ id: string; name: { ar: string; en: string } }>;
};

export function getBusinessCategories() {
  return categories as BusinessCategoryItem[];
}

export function findBusinessCategory(categoryId?: string, subcategoryId?: string) {
  const category = getBusinessCategories().find((item) => item.id === categoryId);
  const subcategory = category?.subcategories.find((item) => item.id === subcategoryId);
  return { category, subcategory };
}

export function buildCategoryPrompt(input: { categoryId?: string; subcategoryId?: string }) {
  const { category, subcategory } = findBusinessCategory(input.categoryId, input.subcategoryId);
  if (!category) return "";
  const categoryName = category.name.en;
  const subcategoryName = subcategory?.name.en || "General";
  return [
    `Business category: ${categoryName}.`,
    `Business subcategory: ${subcategoryName}.`,
    "Adapt customer-care behavior to this industry while still relying on the tenant knowledge base for exact services, products, prices, offers, policies, and contact details.",
    "Use marketing-aware language that is appropriate for the selected industry and the customer's intent.",
  ].join("\n");
}
