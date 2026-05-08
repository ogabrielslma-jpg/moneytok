import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

function mapImperiumStatus(s: string): "paid" | "failed" | "pending" {
  const upper = (s || "").toUpperCase();
  if (["PAGA", "APROVADA", "PAID", "APPROVED"].includes(upper)) return "paid";
  if (["RECUSADA", "CANCELADA", "ESTORNADA", "FAILED", "REJECTED", "CANCELLED"].includes(upper)) return "failed";
  return "pending";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[webhook-public] body:", JSON.stringify(body));

    const sale = body?.sale || body?.data?.sale || body?.data || body;
    const saleId = sale?.id;
    const status = sale?.status;

    if (!saleId) {
      return NextResponse.json({ error: "sale.id obrigatorio" }, { status: 400 });
    }

    const newStatus = mapImperiumStatus(status);
    const supabase = createClient();

    const { data: purchase, error: findError } = await supabase
      .from("public_token_purchases")
      .select("id, status")
      .eq("imperium_sale_id", String(saleId))
      .single();

    if (findError || !purchase) {
      return NextResponse.json({ error: "Compra nao encontrada" }, { status: 404 });
    }

    if (purchase.status === newStatus) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const updateData: any = { status: newStatus };
    if (newStatus === "paid") {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("public_token_purchases")
      .update(updateData)
      .eq("id", purchase.id);

    if (updateError) {
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Webhook publico ativo" });
}
