"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_LANDING_CONFIG, fetchLandingConfig, type LandingConfig } from "@/lib/landing-config";

type PlanIdx = 1 | 2 | 3;

function formatBRL(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatCoins(coins: number): string {
  return coins.toLocaleString("pt-BR");
}

export default function TokensPublicPage() {
  const router = useRouter();
  const [landingConfig, setLandingConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [selectedPlan, setSelectedPlan] = useState<PlanIdx>(2);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(null);

  const dash = landingConfig.dashboard;

  useEffect(() => {
    fetchLandingConfig().then(setLandingConfig).catch(() => {});
  }, []);

  const plans = [
    { idx: 1 as PlanIdx, coins: dash.plan_1_coins, price_cents: dash.plan_1_price_cents, label: dash.plan_1_label, recommended: false },
    { idx: 2 as PlanIdx, coins: dash.plan_2_coins, price_cents: dash.plan_2_price_cents, label: dash.plan_2_label, recommended: true },
    { idx: 3 as PlanIdx, coins: dash.plan_3_coins, price_cents: dash.plan_3_price_cents, label: dash.plan_3_label, recommended: false },
  ];

  function goToCheckout() {
    router.push(`/tokens/comprar?plano=${selectedPlan}`);
  }

  return (
    <div style={{ minHeight: "100vh", background: dash.mtpay_planos_bg }} className="py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10">
          {dash.mtpay_logo_url ? (
            <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <img src={dash.mtpay_logo_url} alt="MoneyTokPay" className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: dash.mtpay_planos_headline_color || "#111827" }}>
            Recarregue suas moedas MoneyTok
          </h1>
          <p className="text-base max-w-2xl mx-auto leading-relaxed" style={{ color: dash.mtpay_planos_subheadline_color || "#6b7280" }}>
            Escolha um plano de moedas. As moedas s\u00e3o creditadas direto no seu perfil ap\u00f3s a confirma\u00e7\u00e3o do pagamento.
          </p>
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
                {isRecommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
                    style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
                  >
                    {dash.mtpay_planos_recommended_badge}
                  </div>
                )}

                {plan.label && !isRecommended && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                    {plan.label}
                  </div>
                )}

                {dash.mtpay_planos_coin_image_url && (
                  <div className="flex items-center justify-center mb-2">
                    <img src={dash.mtpay_planos_coin_image_url} alt="" className="h-16 w-auto object-contain" />
                  </div>
                )}

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

                <div className="text-center border-t border-gray-100 pt-3 mb-2">
                  <div className="text-2xl font-bold text-gray-900">
                    R$ {formatBRL(plan.price_cents)}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    R$ {pricePerCoin.toFixed(3).replace(".", ",")} por moeda
                  </div>
                </div>

                {isSelected && (
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: dash.mtpay_planos_recommended_from }} />
                    <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: dash.mtpay_planos_recommended_from }}>
                      Selecionado
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl p-5 shadow-lg max-w-md mx-auto mb-12">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Seu plano</div>
              <div className="text-base font-bold text-gray-900">{formatCoins(plans.find(p => p.idx === selectedPlan)!.coins)} moedas</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
              <div className="text-xl font-black text-gray-900">R$ {formatBRL(plans.find(p => p.idx === selectedPlan)!.price_cents)}</div>
            </div>
          </div>

          <button
            onClick={goToCheckout}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm transition shadow-lg uppercase tracking-wide hover:opacity-90"
            style={{ background: `linear-gradient(90deg, ${dash.mtpay_planos_recommended_from}, ${dash.mtpay_planos_recommended_to})` }}
          >
            Continuar
          </button>

          <p className="text-[10px] text-center text-gray-500 mt-3">
            Pr\u00f3ximo passo: confirmar seu perfil e gerar PIX.
          </p>
        </div>

        {/* FAQ */}
        {dash.mtpay_planos_faq_items && dash.mtpay_planos_faq_items.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-1" style={{ color: dash.mtpay_planos_faq_headline_color || "#111827" }}>
                {dash.mtpay_planos_faq_title}
              </h2>
              <p className="text-sm" style={{ color: dash.mtpay_planos_faq_subheadline_color || "#6b7280" }}>
                {dash.mtpay_planos_faq_subtitle}
              </p>
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

      </div>
    </div>
  );
}
