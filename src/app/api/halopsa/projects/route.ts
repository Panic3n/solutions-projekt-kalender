import { NextResponse } from "next/server";
import { fetchProjects } from "@/lib/halo";

export async function GET() {
  try {
    const rows = await fetchProjects();
    return NextResponse.json({ ok: true, projects: rows }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed to load projects" }, { status: 400 });
  }
}
