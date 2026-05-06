import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Mapa de planos
const PLANS = {
  starter: { name: "Creator", amount_cents: 7900, fee_pct: 10 },
  creator: { name: "Creator Advanced", amount_cents: 9900, fee_pct: 8 },
  super: { name: "Top Creator", amount_cents: 10900, fee_pct: 4 },
} as const;

type PlanId = keyof typeof PLANS;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { plan_id, customer_name, customer_email, customer_doc, customer_doc_type, customer_phone, coupon_id, coupon_discount_pct } = body;

    // Valida plano
    if (!plan_id || !(plan_id in PLANS)) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }
    const plan = PLANS[plan_id as PlanId];

    // Valida campos
    if (!customer_name || !customer_email || !customer_doc) {
      return NextResponse.json({ error: "Dados do cliente incompletos" }, { status: 400 });
    }

    // Pega usuário autenticado
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Aplica desconto do cupom se fornecido E se o cupom for válido pra esse user
    let amountCents = plan.amount_cents;
    let appliedCouponId: string | null = null;
    if (coupon_id && coupon_discount_pct && coupon_discount_pct > 0 && coupon_discount_pct <= 80) {
      // Valida que o cupom existe, pertence ao user e está ativo
      const { data: coupon } = await supabase
        .from("coupons")
        .select("id, discount_pct, status, expires_at")
        .eq("id", coupon_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (coupon) {
        amountCents = Math.round(plan.amount_cents * (1 - coupon.discount_pct / 100));
        appliedCouponId = coupon.id;
        console.log(`[Checkout] Cupom ${coupon.id} aplicado: ${plan.amount_cents} → ${amountCents} (-${coupon.discount_pct}%)`);
      } else {
        console.warn(`[Checkout] Cupom ${coupon_id} inválido ou expirado`);
      }
    }

    // Lê credenciais do gateway das variáveis de ambiente
    const publicKey = process.env.IMPERIUMPAY_PUBLIC_KEY;
    const privateKey = process.env.IMPERIUMPAY_PRIVATE_KEY;

    // DIAGNÓSTICO: log detalhado do estado das variáveis
    const envDiagnostic = {
      has_public_key: !!publicKey,
      has_private_key: !!privateKey,
      public_key_prefix: publicKey ? publicKey.substring(0, 8) + "..." : "MISSING",
      private_key_length: privateKey ? privateKey.length : 0,
    };
    console.log("[Checkout] Env diagnostic:", JSON.stringify(envDiagnostic));

    if (!publicKey || !privateKey) {
      // Modo demo: gateway não configurado, retorna mock
      const reason = !publicKey && !privateKey
        ? "Nenhuma das duas chaves está configurada"
        : !publicKey
          ? "IMPERIUMPAY_PUBLIC_KEY não está configurada"
          : "IMPERIUMPAY_PRIVATE_KEY não está configurada";
      console.warn("[Checkout] Modo demo. Motivo:", reason);
      const mockSaleId = `mock_${Date.now()}`;
      const { data: sub, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan_id,
          amount_cents: amountCents,
          fee_pct: plan.fee_pct,
          status: "pending",
          gateway_sale_id: mockSaleId,
          pix_qr_code: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAQAAACBKkBwAAABw0lEQVR42u3aSY7DMAxE0fH9D52ZgYFkccnSUjzwL68iCv+Vsps22Va7q7ouIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi/8MRzyfOjnjxbc2QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0PuDLkz5M6QO0Pu/v8N+wM+iQAAAABJRU5ErkJggg==",
          pix_key: `00020101021226880014BR.GOV.BCB.PIX2566demo${mockSaleId}5204000053039865802BR5905DEMO6008SAOPAULO62070503***6304ABCD`,
        })
        .select()
        .single();
      if (subError) {
        return NextResponse.json({ error: "Erro ao criar assinatura: " + subError.message }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        demo: true,
        demo_reason: reason,
        env_diagnostic: envDiagnostic,
        subscription_id: sub.id,
        sale_id: mockSaleId,
        qr_code_base64: sub.pix_qr_code,
        pix_key: sub.pix_key,
        amount: amountCents,
        plan_name: plan.name,
      });
    }

    // Determina URL do webhook (precisa do host público pra ImperiumPay alcançar)
    const host = req.headers.get("host") || "feet-photos.vercel.app";
    const protocol = host.includes("localhost") ? "http" : "https";
    const postbackUrl = `${protocol}://${host}/api/checkout/webhook`;

    // Chama ImperiumPay
    const gatewayPayload = {
      amount: amountCents,
      paymentMethod: "PIX",
      customer: {
        name: customer_name,
        email: customer_email,
        document: {
          type: customer_doc_type || "cpf",
          number: customer_doc.replace(/\D/g, ""),
        },
        phone: (customer_phone || "11999999999").replace(/\D/g, ""),
      },
      items: [
        {
          title: `FootPriv — Plano ${plan.name} Anual`,
          unitPrice: amountCents,
          quantity: 1,
          tangible: false,
        },
      ],
      postbackUrl,
      metadata: {
        user_id: user.id,
        plan_id,
        source: "footpriv-app",
      },
    };

    const gatewayRes = await fetch("https://api.imperiumpay.com.br/api/sales", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Public-Key": publicKey,
        "X-Api-Private-Key": privateKey,
      },
      body: JSON.stringify(gatewayPayload),
    });

    const gatewayData = await gatewayRes.json();

    if (!gatewayRes.ok || !gatewayData.sale) {
      console.error("[Checkout] Erro do gateway:", gatewayData);
      return NextResponse.json({
        error: gatewayData.message || "Erro ao processar pagamento",
        details: gatewayData,
      }, { status: 502 });
    }

    const sale = gatewayData.sale;

    // Salva assinatura no banco
    const { data: sub, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan_id,
        amount_cents: amountCents,
        fee_pct: plan.fee_pct,
        status: "pending",
        gateway_sale_id: String(sale.id),
        pix_qr_code: sale.payment?.pix?.qrCodeBase64 || null,
        pix_key: sale.payment?.pix?.key || null,
      })
      .select()
      .single();

    if (subError) {
      console.error("[Checkout] Erro ao salvar:", subError);
      return NextResponse.json({ error: "Pagamento criado mas falhou ao salvar: " + subError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      demo: false,
      subscription_id: sub.id,
      sale_id: sale.id,
      qr_code_base64: sale.payment?.pix?.qrCodeBase64,
      pix_key: sale.payment?.pix?.key,
      amount: amountCents,
      plan_name: plan.name,
    });
  } catch (e: any) {
    console.error("[Checkout] Falha:", e);
    return NextResponse.json({ error: e?.message || "Erro inesperado" }, { status: 500 });
  }
}

// GET: consulta status de uma subscription (polling do frontend)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subId = searchParams.get("subscription_id");
    if (!subId) {
      return NextResponse.json({ error: "subscription_id obrigatório" }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    // Se ainda pending E é real (não mock), consulta gateway pra ter status atualizado
    if (sub.status === "pending" && !sub.gateway_sale_id?.startsWith("mock_")) {
      const publicKey = process.env.IMPERIUMPAY_PUBLIC_KEY;
      const privateKey = process.env.IMPERIUMPAY_PRIVATE_KEY;

      if (publicKey && privateKey && sub.gateway_sale_id) {
        try {
          const r = await fetch(`https://api.imperiumpay.com.br/api/sales/${sub.gateway_sale_id}`, {
            headers: {
              "X-Api-Public-Key": publicKey,
              "X-Api-Private-Key": privateKey,
            },
          });
          const d = await r.json();
          if (r.ok && d.sale?.status === "PAGO") {
            // Atualiza pra paid
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);
            await supabase
              .from("subscriptions")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                expires_at: expires.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", subId);
            sub.status = "paid";
          }
        } catch (e) {
          console.warn("[Checkout GET] Falha ao consultar gateway:", e);
        }
      }
    }

    return NextResponse.json({
      status: sub.status,
      paid_at: sub.paid_at,
      plan_id: sub.plan_id,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro" }, { status: 500 });
  }
}
