import { NextRequest, NextResponse } from "next/server";
import { fetchOpenAQSummary, resolveRegion } from "@/lib/api/demo";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
  }

  const region = resolveRegion(req.nextUrl.searchParams.get("region") ?? undefined);

  try {
    const data = await fetchOpenAQSummary(region, token);
    return NextResponse.json(data);
  } catch (err) {
    console.error("openaq fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch OpenAQ data" }, { status: 502 });
  }
}
