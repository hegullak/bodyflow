import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import * as XLSX from "xlsx";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

async function fetchAll() {
  const db = getDb();
  return db
    .select({
      id: exercises.id,
      slug: exercises.slug,
      name: exercises.name,
      nameNo: exercises.nameNo,
      equipment: exercises.equipment,
      source: exercises.source,
    })
    .from(exercises)
    .orderBy(asc(exercises.name));
}

export async function GET(req: NextRequest) {
  await requireUserId();
  const fmt = new URL(req.url).searchParams.get("format") ?? "json";
  const rows = await fetchAll();

  if (fmt === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="exercises.json"`,
      },
    });
  }

  if (fmt === "csv") {
    const header = "id,slug,name,nameNo,equipment,source";
    const csvRows = rows.map((r) =>
      [r.id, r.slug, `"${(r.name ?? "").replace(/"/g, '""')}"`, `"${(r.nameNo ?? "").replace(/"/g, '""')}"`, r.equipment, r.source].join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exercises.csv"`,
      },
    });
  }

  if (fmt === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exercises");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown as ArrayBuffer;
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="exercises.xlsx"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
