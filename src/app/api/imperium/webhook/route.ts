import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase-server";

// Mapeia status da ImperiumPay -> nosso status interno
function mapImperiumStatus(imperiumStatus: string): "paid" | "failed" | "pending" {
  const upper = (imperiumStatus || "").toUpperCase();
  if (upper === "PAGA" || upper === "APROVADA" || upper === "PAID" || upper === "APPROVED") {
    return "paid";
  }
  if (upper === "RECUSADA" || upper === "CANCELADA" || upper === "ESTORNADA" || upper === "FAILED" || upper === "REJECTED" || upper === "CANCELLED") {
    return "failed";
  }
  return "pending";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[imperium/webhook] body recebido:", JSON.stringify(body));

    // ImperiumPay manda objeto com sale ou data?.sale
    const sale = body?.sale || body?.data?.sale || body?.data || body;
    const saleId = sale?.id;
    const status = sale?.status;

    if (!saleId) {
      console.error("[imperium/webhook] sale.id ausente no body");
      return NextResponse.json({ error: "sale.id obrigatorio" }, { status: 400 });
    }

    const newStatus = mapImperiumStatus(status);

    // Service role pra contornar RLS (o webhook nao tem user logado)
    const supabase = createServerClient();

    // Acha purchase pelo imperium_sale_id e atualiza
    const { data: purchase, error: findError } = await supabase
      .from("moneytok_pay_purchases")
      .select("id, status")
      .eq("imperium_sale_id", String(saleId))
      .single();

    if (findError || !purchase) {
      console.error("[imperium/webhook] purchase nao encontrada:", saleId, findError);
      return NextResponse.json({ error: "Purchase nao encontrada" }, { status: 404 });
    }

    // Idempotencia: se ja tava paid, ignora
    if (purchase.status === newStatus) {
      console.log("[imperium/webhook] status ja era", newStatus, "- ignorando");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { error: updateError } = await supabase
      .from("moneytok_pay_purchases")
      .update({ status: newStatus })
      .eq("id", purchase.id);

    if (updateError) {
      console.error("[imperium/webhook] erro update:", updateError);
      return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }

    console.log(`[imperium/webhook] purchase ${purchase.id} -> status=${newStatus}`);
    return NextResponse.json({ ok: true, status: newStatus });
  } catch (err: any) {
    console.error("[imperium/webhook] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}

// Healthcheck (alguns gateways testam GET)
export async function GET() {
  return NextResponse.json({ ok: true, message: "ImperiumPay webhook ativo" });
}
