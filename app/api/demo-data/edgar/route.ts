import { NextRequest, NextResponse } from "next/server";
import { fetchEdgarSummary, resolveRegion } from "@/lib/api/demo";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Authorization header required" }, { status: 401 });
  }

  const region = resolveRegion(req.nextUrl.searchParams.get("region") ?? undefined);
  const start_date = req.nextUrl.searchParams.get("start_date") ?? undefined;
  const end_date = req.nextUrl.searchParams.get("end_date") ?? undefined;

  try {
    const data = await fetchEdgarSummary(region, token, { start_date, end_date });
    return NextResponse.json(data);
  } catch (err) {
    console.error("edgar fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch EDGAR data" }, { status: 502 });
  }
}
