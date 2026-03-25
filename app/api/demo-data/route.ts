import { NextRequest, NextResponse } from "next/server";
import { getNepalDemoData } from "@/lib/api/demo";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 }
    );
  }

  const region = req.nextUrl.searchParams.get("region") ?? "nepal";

  try {
    const data = await getNepalDemoData(token, region);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Failed to fetch demo data:", err);
    return NextResponse.json(
      { error: "Failed to fetch live data" },
      { status: 502 }
    );
  }
}
