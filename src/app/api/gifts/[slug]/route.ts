import type { NextRequest } from "next/server";
import { publicGet, publicPost } from "@/features/gift-lists/server/api";
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: NextRequest, context: Context) {
  return publicGet(request, (await context.params).slug);
}
export async function POST(request: NextRequest, context: Context) {
  return publicPost(request, (await context.params).slug);
}
