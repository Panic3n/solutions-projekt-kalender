import { NextResponse } from "next/server";
import { fetchConsultants } from "@/lib/halo";

export async function GET() {
  try {
    const rows = await fetchConsultants();
    return NextResponse.json({ ok: true, consultants: rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load consultants" }, { status: 400 });
  }
}
