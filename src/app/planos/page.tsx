"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: "starter" | "creator" | "super";
  name: string;
  emoji: string;
  yearly: number;
  fee_pct: number;
  tagline: string;
  withdraw_limit: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Creator",
    emoji: "🪙",
    yearly: 79,
    fee_pct: 10,
    tagline: "Pra quem está começando",
    withdraw_limit: "Saques até R$ 12.000 / mês",
    features: [
      "Saque PIX instantâneo 24h",
      "Saque instantâneo",
      "Leilões ilimitados",
      "Carteira digital",
      "Suporte por email",
    ],
  },
  {
    id: "creator",
    name: "Creator Advanced",
    emoji: "⭐",
    yearly: 99,
    fee_pct: 8,
    tagline: "Pra quem fatura todo mês",
    withdraw_limit: "Saques até R$ 48.000 / mês",
    features: [
      "Saque PIX instantâneo 24h",
      "Saque instantâneo",
      "Leilões ilimitados",
      "Suporte prioritário",
      "Acesso a leilões VIP",
      "Analytics básico",
    ],
  },
  {
    id: "super",
    name: "Top Creator",
    emoji: "👑",
    yearly: 109,
    fee_pct: 4,
    tagline: "Pra creators de alto volume",
    withdraw_limit: "Saques acima de R$ 48.000 / mês",
    features: [
      "Saque PIX instantâneo 24h",
      "Limite de saque ilimitado",
      "Taxa de apenas 4% (a menor)",
      "Selo verificado no perfil",
      "Posicionamento prioritário no feed",
      "Relatório semanal personalizado",
      "Atendimento dedicado",
    ],
    highlight: true,
    badge: "⭐ MAIS POPULAR",
  },
];

const SAMPLE_REVENUES = [
  { monthly: 5000, label: "Iniciante" },
  { monthly: 25000, label: "Intermediária" },
  { monthly: 60000, label: "Top Creator" },
];

export default function PlanosPage() {
  const router = useRouter();
  const [selectedRevenue, setSelectedRevenue] = useState(SAMPLE_REVENUES[1]);

  function calcAnnualNet(plan: Plan, monthly: number): number {
    const annualGross = monthly * 12;
    const fee = annualGross * (plan.fee_pct / 100);
    return annualGross - fee - plan.yearly;
  }

  function bestPlanFor(monthly: number): string {
    let bestId = PLANS[0].id;
    let bestNet = -Infinity;
    PLANS.forEach((p) => {
      const net = calcAnnualNet(p, monthly);
      if (net > bestNet) {
        bestNet = net;
        bestId = p.id;
      }
    });
    return bestId;
  }

  const currentBest = bestPlanFor(selectedRevenue.monthly);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-semibold">Voltar</span>
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg tracking-[0.15em] text-gray-900">FOOT</span>
            <span className="font-display text-xs tracking-[0.4em] text-gray-500">FANS</span>
          </div>
          <div className="w-16"></div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-emerald-600 mb-3">
            Planos Anuais
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-gray-900 mb-4 leading-tight">
            Pague uma vez por ano<br />e foque em vender
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Quanto mais você fatura, menor a taxa. Saques via PIX 24h por dia, instantâneos.
          </p>
        </div>

        {/* Calculadora */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-2xl p-5 mb-10 max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-wider text-emerald-700 font-bold mb-3 text-center">
            💡 Quanto você ganharia em 1 ano
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {SAMPLE_REVENUES.map((r) => (
              <button
                key={r.monthly}
                onClick={() => setSelectedRevenue(r)}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  selectedRevenue.monthly === r.monthly
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-white text-gray-700 hover:bg-emerald-50 border border-emerald-200"
                }`}
              >
                <div className="text-[10px] opacity-80 uppercase tracking-wider">{r.label}</div>
                <div className="text-base mt-0.5">R$ {r.monthly.toLocaleString("pt-BR")}/mês</div>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-center text-emerald-800/70">
            Faturamento mensal estimado em vendas
          </p>
        </div>

        {/* Cards de planos */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {PLANS.map((plan) => {
            const annualNet = calcAnnualNet(plan, selectedRevenue.monthly);
            const isBest = plan.id === currentBest;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl overflow-hidden transition-all hover:shadow-2xl ${
                  plan.highlight
                    ? "ring-2 ring-emerald-500 shadow-xl md:scale-105"
                    : "border border-gray-200 shadow-sm"
                }`}
              >
                {plan.badge && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-center py-1.5 text-[10px] font-bold uppercase tracking-wider">
                    {plan.badge}
                  </div>
                )}

                <div className={`p-6 ${plan.badge ? "pt-12" : ""}`}>
                  {/* Header */}
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">{plan.emoji}</div>
                    <h3 className="font-display text-2xl text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{plan.tagline}</p>
                    <div className="mt-2 inline-flex bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">{plan.withdraw_limit}</span>
                    </div>
                  </div>

                  {/* Preço */}
                  <div className="text-center py-5 border-y border-gray-100 mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-sm text-gray-500">R$</span>
                      <span className="font-display text-5xl text-gray-900 tabular-nums">{plan.yearly}</span>
                      <span className="text-sm text-gray-500">/ano</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                      <span className="text-[11px] text-gray-500">+</span>
                      <span className={`text-sm font-bold tabular-nums ${
                        plan.fee_pct <= 4 ? "text-emerald-600" :
                        plan.fee_pct <= 8 ? "text-gray-900" :
                        "text-gray-700"
                      }`}>
                        {plan.fee_pct}% de taxa
                      </span>
                      <span className="text-[11px] text-gray-500">por venda</span>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-2">
                      Pagamento único · cobra 1 vez por ano
                    </div>
                  </div>

                  {/* Simulação */}
                  <div className={`rounded-xl p-3 mb-4 text-center ${
                    isBest
                      ? "bg-emerald-50 border border-emerald-200"
                      : "bg-gray-50 border border-gray-100"
                  }`}>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                      Faturando R$ {selectedRevenue.monthly.toLocaleString("pt-BR")}/mês
                    </div>
                    <div className="text-2xl font-display text-gray-900 tabular-nums">
                      R$ {annualNet.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      Líquido em 1 ano
                    </div>
                    {isBest && (
                      <div className="mt-2 inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ✓ Melhor opção
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                          plan.highlight ? "text-emerald-600" : "text-gray-400"
                        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3.5 rounded-xl font-bold transition text-sm tracking-wide uppercase ${
                      plan.highlight
                        ? "bg-gray-900 hover:bg-black text-white shadow-lg"
                        : "bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900"
                    }`}
                  >
                    {plan.highlight ? "Assinar agora" : "Selecionar plano"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
          <h3 className="font-display text-xl text-gray-900 mb-4">Perguntas frequentes</h3>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Posso cancelar quando quiser?</div>
              <p className="text-xs text-gray-600">Sim. Sem multa, sem fidelidade. Cancele a qualquer momento e continue usando até o fim do ano contratado.</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Como funciona a taxa por venda?</div>
              <p className="text-xs text-gray-600">A taxa é descontada automaticamente quando o lance vencedor é confirmado. Você recebe o valor já líquido na carteira.</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">E se eu passar do limite mensal de saque?</div>
              <p className="text-xs text-gray-600">O excedente fica disponível pra sacar no mês seguinte, ou você pode fazer upgrade pra um plano superior. O saldo nunca é perdido.</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Posso trocar de plano depois?</div>
              <p className="text-xs text-gray-600">Pode. No upgrade, paga só a diferença proporcional. No downgrade, vale no próximo ciclo anual.</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 mb-1">Como pago?</div>
              <p className="text-xs text-gray-600">Pagamento único anual via PIX (à vista, com 5% de cashback) ou cartão (até 12x sem juros).</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-10">
          <div className="inline-flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Pagamento seguro
            </span>
            <span>·</span>
            <span>Cancele quando quiser</span>
            <span>·</span>
            <span>Saques 24h por dia</span>
          </div>
        </div>
      </div>
    </div>
  );
}
