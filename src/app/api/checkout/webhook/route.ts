import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint que a ImperiumPay chama quando o pagamento muda de status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[Webhook] Recebido:", JSON.stringify(body));

    // ImperiumPay envia o objeto sale no postback
    const sale = body.sale || body;
    if (!sale.id) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const saleId = String(sale.id);
    const status = sale.status; // PAGO, PENDENTE, CANCELADO, ESTORNADO

    // Cliente Supabase com service role (bypass RLS pra atualizar qualquer linha)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) {
      console.error("[Webhook] Service key não configurada");
      return NextResponse.json({ error: "Config faltando" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Acha assinatura
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("gateway_sale_id", saleId)
      .maybeSingle();

    if (!sub) {
      console.warn("[Webhook] Sub não encontrada pra sale:", saleId);
      return NextResponse.json({ ignored: true });
    }

    // Atualiza status
    let newStatus = sub.status;
    let paidAt = sub.paid_at;
    let expiresAt = sub.expires_at;

    if (status === "PAGO") {
      newStatus = "paid";
      paidAt = new Date().toISOString();
      const exp = new Date();
      exp.setFullYear(exp.getFullYear() + 1);
      expiresAt = exp.toISOString();
    } else if (status === "CANCELADO" || status === "ESTORNADO") {
      newStatus = "cancelled";
    }

    await supabase
      .from("subscriptions")
      .update({
        status: newStatus,
        paid_at: paidAt,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    // Se virou paid, marca eventual cupom ativo do user como usado
    if (newStatus === "paid") {
      try {
        await supabase
          .from("coupons")
          .update({ status: "used", used_at: new Date().toISOString() })
          .eq("user_id", sub.user_id)
          .eq("status", "active");
      } catch (e) {
        console.warn("[Webhook] Falhou ao marcar cupom usado:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("[Webhook] Erro:", e);
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
