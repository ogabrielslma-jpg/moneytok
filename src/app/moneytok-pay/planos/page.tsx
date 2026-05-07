"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { DEFAULT_LANDING_CONFIG, fetchLandingConfig, type LandingConfig } from "@/lib/landing-config";

type PlanIdx = 1 | 2 | 3;

type Plan = {
  idx: PlanIdx;
  coins: number;
  price_cents: number;
  label: string;
  recommended: boolean;
};

function formatBRL(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatCoins(coins: number): string {
  return coins.toLocaleString("pt-BR");
}

export default function MoneyTokPayPlanosPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authChecked, setAuthChecked] = useState(false);
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [selectedPlan, setSelectedPlan] = useState<PlanIdx>(2);
  const [showPixModal, setShowPixModal] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);
  const [error, setError] = useState("");

  const dash = landingConfig.dashboard;

  // Auth + carrega config
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("has_moneytok_pay, has_active_plan")
        .eq("id", user.id)
        .single();

      // Sem MoneyTokPay -> manda pra cadastro
      if (!profileData?.has_moneytok_pay) {
        router.push("/moneytok-pay/cadastro");
        return;
      }

      // Ja tem plano ativo -> manda pro dashboard
      if (profileData?.has_active_plan) {
        router.push("/dashboard");
        return;
      }

      try {
        const cfg = await fetchLandingConfig();
        setLandingConfig(cfg);
      } catch (e) {
        console.warn("[planos] erro config:", e);
      }
      setAuthChecked(true);
    }
    check();
  }, [router, supabase]);

  // Constroi lista de 3 planos a partir da config
  const plans: Plan[] = [
    { idx: 1, coins: dash.plan_1_coins, price_cents: dash.plan_1_price_cents, label: dash.plan_1_label, recommended: false },
    { idx: 2, coins: dash.plan_2_coins, price_cents: dash.plan_2_price_cents, label: dash.plan_2_label, recommended: true },
    { idx: 3, coins: dash.plan_3_coins, price_cents: dash.plan_3_price_cents, label: dash.plan_3_label, recommended: false },
  ];

  const currentPlan = plans.find((p) => p.idx === selectedPlan)!;

  async function handleSimulate() {
    setError("");
    setPurchasing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sessao expirada");
        setPurchasing(false);
        return;
      }

      // Pega account_id do user
      const { data: account } = await supabase
        .from("moneytok_pay_accounts")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!account) {
        setError("Conta MoneyTokPay nao encontrada");
        setPurchasing(false);
        return;
      }

      // Cria compra com status 'simulated' - trigger ativa moedas + plano
      const { error: insertError } = await supabase
        .from("moneytok_pay_purchases")
        .insert({
          user_id: user.id,
          account_id: account.id,
          coins: currentPlan.coins,
          amount_cents: currentPlan.price_cents,
          status: "simulated",
          payment_method: "pix",
        });

      if (insertError) {
        console.error("[planos] insert error:", insertError);
        setError("Erro ao processar pagamento");
        setPurchasing(false);
        return;
      }

      // Sucesso -> redireciona pra dashboard
      router.push("/dashboard");
    } catch (e) {
      console.error("[planos] simulate error:", e);
      setError("Erro inesperado");
      setPurchasing(false);
    }
  }

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: dash.mtpay_planos_bg }} className=" flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: dash.mtpay_planos_bg }} className=" py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          {dash.mtpay_logo_url ? (
            <div className="w-20 h-20 mx-auto mb-3 flex items-center justify-center">
              <img src={dash.mtpay_logo_url} alt="MoneyTokPay" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div
              className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          )}
          <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: dash.mtpay_planos_headline_color || "#111827" }}>{dash.mtpay_planos_title}</h1>
          <p className="text-sm max-w-2xl mx-auto leading-relaxed" style={{ color: dash.mtpay_planos_subheadline_color || "#6b7280" }}>{dash.mtpay_planos_subtitle}</p>
        </div>

        {/* 3 Cards de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {plans.map((plan) => {
            const isSelected = plan.idx === selectedPlan;
            const isRecommended = plan.recommended;
            const pricePerCoin = (plan.price_cents / 100) / plan.coins;

            return (
              <div
                key={plan.idx}
                onClick={() => setSelectedPlan(plan.idx)}
                className="relative cursor-pointer transition-all rounded-2xl p-6 bg-white"
                style={{
                  border: isSelected
                    ? `2px solid ${dash.mtpay_planos_recommended_from}`
                    : `2px solid ${dash.mtpay_planos_default_border}`,
                  boxShadow: isSelected
                    ? `0 8px 24px ${dash.mtpay_planos_recommended_from}33`
                    : "0 2px 8px rgba(0,0,0,0.05)",
                  transform: isSelected ? "translateY(-4px)" : "none",
                }}
              >
                {/* Badge recomendado */}
                {isRecommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
                    style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
                  >
                    {dash.mtpay_planos_recommended_badge}
                  </div>
                )}

                {/* Label customizado */}
                {plan.label && !isRecommended && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                    {plan.label}
                  </div>
                )}

                {/* Moedas */}
                <div className="text-center mb-3">
                  <div
                    className="text-4xl font-black"
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})`
                        : "none",
                      WebkitBackgroundClip: isSelected ? "text" : "initial",
                      WebkitTextFillColor: isSelected ? "transparent" : "#111827",
                      backgroundClip: isSelected ? "text" : "initial",
                    }}
                  >
                    {formatCoins(plan.coins)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">moedas</div>
                </div>

                {/* Preco */}
                <div className="text-center border-t border-gray-100 pt-3 mb-2">
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {formatBRL(plan.price_cents)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    R$ {pricePerCoin.toFixed(3).replace(".", ",")} por moeda
                  </div>
                </div>

                {/* Indicador selecionado */}
                {isSelected && (
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: dash.mtpay_planos_recommended_from }}
                    />
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: dash.mtpay_planos_recommended_from }}>
                      Selecionado
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA principal */}
        <div className="bg-white rounded-2xl p-5 shadow-lg max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Seu plano</div>
              <div className="text-base font-bold text-gray-900">{formatCoins(currentPlan.coins)} moedas</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
              <div className="text-xl font-black text-gray-900">R$ {formatBRL(currentPlan.price_cents)}</div>
            </div>
          </div>

          <button
            onClick={() => setShowPixModal(true)}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm transition shadow-lg uppercase tracking-wide hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
          >
            Pagar com PIX
          </button>

          <p className="text-[10px] text-center text-gray-500 mt-3">
            Pagamento processado via MoneyTokPay. Suas moedas s\u00e3o ativadas instantaneamente.
          </p>
        </div>

      </div>

        {/* FAQ accordion */}
        {dash.mtpay_planos_faq_items && dash.mtpay_planos_faq_items.length > 0 && (
          <div className="max-w-2xl mx-auto mt-12">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: dash.mtpay_planos_faq_headline_color || "#111827" }}>{dash.mtpay_planos_faq_title}</h2>
              <p className="text-sm" style={{ color: dash.mtpay_planos_faq_subheadline_color || "#6b7280" }}>{dash.mtpay_planos_faq_subtitle}</p>
            </div>
            <div className="space-y-2">
              {dash.mtpay_planos_faq_items.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={idx}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all"
                    style={{
                      borderColor: isOpen ? dash.mtpay_planos_recommended_from : undefined,
                      boxShadow: isOpen ? `0 4px 12px ${dash.mtpay_planos_recommended_from}22` : undefined,
                    }}
                  >
                    <button
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-gray-50 transition"
                    >
                      <span className="text-sm font-semibold text-gray-900 flex-1">{item.question}</span>
                      <svg
                        className="w-5 h-5 text-gray-400 transition-transform flex-shrink-0"
                        style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 -mt-1">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {/* === MODAL PIX === */}
      {showPixModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl">
            <button
              onClick={() => setShowPixModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{dash.mtpay_planos_pix_title}</h2>
            <p className="text-xs text-gray-600 text-center mb-5 leading-relaxed">{dash.mtpay_planos_pix_instruction}</p>

            {/* QR Code falso */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-4 flex flex-col items-center">
              <div className="w-48 h-48 bg-white border-2 border-gray-200 rounded-xl p-3 flex items-center justify-center mb-3">
                {/* SVG fake QR Code (matriz 21x21) */}
                <svg viewBox="0 0 21 21" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  {Array.from({ length: 21 }).map((_, y) =>
                    Array.from({ length: 21 }).map((_, x) => {
                      const seed = (x * 7 + y * 13 + currentPlan.coins) % 3;
                      const corner = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
                      const cornerInner = (x >= 1 && x <= 5 && y >= 1 && y <= 5) ||
                                          (x >= 15 && x <= 19 && y >= 1 && y <= 5) ||
                                          (x >= 1 && x <= 5 && y >= 15 && y <= 19);
                      const cornerCenter = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                                           (x >= 16 && x <= 18 && y >= 2 && y <= 4) ||
                                           (x >= 2 && x <= 4 && y >= 16 && y <= 18);
                      let fill = "white";
                      if (corner && !cornerInner) fill = "black";
                      else if (corner && cornerInner && !cornerCenter) fill = "white";
                      else if (corner && cornerCenter) fill = "black";
                      else if (seed === 0) fill = "black";
                      return <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />;
                    })
                  )}
                </svg>
              </div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Escaneie ou copie o c\u00f3digo</div>
            </div>

            {/* Codigo PIX falso */}
            <div className="bg-gray-100 rounded-xl p-3 mb-4 flex items-center gap-2">
              <code className="flex-1 text-[10px] text-gray-700 font-mono truncate">
                00020126360014BR.GOV.BCB.PIX0114{currentPlan.coins}5204000053039865802BR
              </code>
              <button className="text-xs text-pink-600 font-semibold whitespace-nowrap hover:text-pink-700">
                Copiar
              </button>
            </div>

            {/* Resumo do plano */}
            <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-xl p-3 mb-4 text-xs text-gray-700">
              <div className="flex justify-between mb-1">
                <span>Moedas:</span>
                <span className="font-bold">{formatCoins(currentPlan.coins)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-gray-900">
                <span>Total:</span>
                <span>R$ {formatBRL(currentPlan.price_cents)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 mb-3">
                {error}
              </div>
            )}

            {/* Botao simular pagamento */}
            <button
              onClick={handleSimulate}
              disabled={purchasing}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm transition shadow-lg uppercase tracking-wide hover:opacity-90 disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
            >
              {purchasing ? "Processando..." : dash.mtpay_planos_simulate_button}
            </button>

            <p className="text-[10px] text-center text-gray-500 mt-3">
              Modo de simula\u00e7\u00e3o ativo. Em produ\u00e7\u00e3o, o pagamento real via PIX confirma automaticamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
