import { NextResponse } from "next/server";
import { getBusinessCategories } from "@/lib/business-categories";

export async function GET() {
  return NextResponse.json({ categories: getBusinessCategories() });
}
