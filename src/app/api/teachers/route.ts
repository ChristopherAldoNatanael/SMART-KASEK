import { NextResponse } from "next/server";
import { getTeachers } from "@/services/teacher.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const teachers = await getTeachers();
    return NextResponse.json(teachers);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}
