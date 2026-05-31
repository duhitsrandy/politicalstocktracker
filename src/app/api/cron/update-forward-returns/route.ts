import { NextResponse } from "next/server";
import { updateForwardReturns } from "@/lib/jobs/update-forward-returns";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await updateForwardReturns();
  return NextResponse.json(result);
}
