import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("saleId");
    if (!saleId) {
      return NextResponse.json({ error: "saleId obrigatorio" }, { status: 400 });
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("public_token_purchases")
      .select("status")
      .eq("imperium_sale_id", String(saleId))
      .single();

    if (error || !data) {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({ status: data.status });
  } catch (err: any) {
    return NextResponse.json({ status: "pending" });
  }
}
