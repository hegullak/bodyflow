import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { getDb } from "@/db/client";
import { foodProducts } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";

async function fetchAll(source: string) {
  const db = getDb();
  const base = db
    .select({
      id: foodProducts.id,
      source: foodProducts.source,
      name: foodProducts.name,
      prettyName: foodProducts.prettyName,
      brand: foodProducts.brand,
      kcalPer100g: foodProducts.kcalPer100g,
      ean: foodProducts.ean,
    })
    .from(foodProducts)
    .orderBy(asc(foodProducts.name));

  if (source === "kassal" || source === "matvaretabellen" || source === "custom") {
    return base.where(eq(foodProducts.source, source));
  }
  return base;
}

export async function GET(req: NextRequest) {
  await requireUserId();
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format") ?? "json";
  const source = url.searchParams.get("source") ?? "all";
  const rows = await fetchAll(source);

  if (fmt === "json") {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="foods-${source}.json"`,
      },
    });
  }

  if (fmt === "csv") {
    const header = "id,source,name,prettyName,brand,kcalPer100g,ean";
    const csvRows = rows.map((r) =>
      [
        r.id,
        r.source,
        `"${(r.name ?? "").replace(/"/g, '""')}"`,
        `"${(r.prettyName ?? "").replace(/"/g, '""')}"`,
        `"${(r.brand ?? "").replace(/"/g, '""')}"`,
        r.kcalPer100g,
        r.ean ?? "",
      ].join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="foods-${source}.csv"`,
      },
    });
  }

  if (fmt === "xlsx") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Foods");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as unknown as ArrayBuffer;
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="foods-${source}.xlsx"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
