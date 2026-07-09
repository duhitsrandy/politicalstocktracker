import { NextResponse } from "next/server";
import { pollWhiteHouse } from "@/lib/jobs/poll-sources";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await pollWhiteHouse();
    return NextResponse.json(result);
  } catch (error) {
    console.error("poll-whitehouse cron failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    );
  }
}
