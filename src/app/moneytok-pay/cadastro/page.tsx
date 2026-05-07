"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

type Step = 1 | 2 | 3;
type PayoutMethod = "bank" | "pix" | null;
type PixKeyType = "cpf" | "email" | "phone" | "random";
type BankAccountType = "checking" | "savings";

// Mascara CPF: 000.000.000-00
function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

// Mascara telefone: (00) 00000-0000
function maskPhone(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

// Validacoes
function isValidCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  return clean.length === 11 && !/^(\d)\1{10}$/.test(clean);
}

function isAdult(birthDate: string): boolean {
  if (!birthDate) return false;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return false;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 18 && age <= 120;
}

function isValidPhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  return clean.length >= 10 && clean.length <= 11;
}

export default function MoneyTokPayCadastroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  // Step 1: dados pessoais
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: payout method
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(null);
  const [bankName, setBankName] = useState("");
  const [bankAgency, setBankAgency] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountType, setBankAccountType] = useState<BankAccountType>("checking");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>("cpf");

  // Verifica auth e se ja tem conta
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("has_moneytok_pay")
        .eq("id", user.id)
        .single();

      if (profileData?.has_moneytok_pay) {
        // Ja tem conta, redireciona pra dashboard
        router.push("/dashboard");
        return;
      }
      setAuthChecked(true);
    }
    check();
  }, [router, supabase]);

  // Validacao step 1
  const step1Valid =
    fullName.trim().length >= 3 &&
    isValidCPF(cpf) &&
    isAdult(birthDate) &&
    isValidPhone(phone);

  // Validacao step 2
  const step2Valid = (() => {
    if (!payoutMethod) return true; // pode pular
    if (payoutMethod === "bank") {
      return !!(bankName && bankAgency && bankAccount && bankAccountType);
    }
    if (payoutMethod === "pix") {
      return !!(pixKey && pixKeyType);
    }
    return false;
  })();

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Sessao expirada. Faca login novamente.");
        setLoading(false);
        return;
      }

      const payload: any = {
        full_name: fullName.trim(),
        cpf: cpf.replace(/\D/g, ""),
        birth_date: birthDate,
        phone: phone.replace(/\D/g, ""),
      };

      if (payoutMethod === "bank") {
        payload.payout_method = "bank";
        payload.bank_name = bankName.trim();
        payload.bank_agency = bankAgency.replace(/\D/g, "");
        payload.bank_account = bankAccount.replace(/\D/g, "");
        payload.bank_account_type = bankAccountType;
        payload.bank_holder_name = fullName.trim();
        payload.bank_holder_doc = cpf.replace(/\D/g, "");
      } else if (payoutMethod === "pix") {
        payload.payout_method = "pix";
        payload.pix_key = pixKey.trim();
        payload.pix_key_type = pixKeyType;
      }

      const resp = await fetch("/api/moneytok-pay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setError(json.error || "Erro ao criar conta");
        setLoading(false);
        return;
      }

      // Sucesso: vai pro step 3 (sucesso)
      setStep(3);
    } catch (e) {
      console.error("[moneytok-pay/cadastro] error:", e);
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-orange-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MoneyTokPay</h1>
          <p className="text-sm text-gray-500">Sua carteira dentro do MoneyTok</p>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition ${
                step >= s ? "bg-gradient-to-r from-pink-500 to-orange-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center mb-6">
          Passo {step} de 3
        </p>

        {/* === STEP 1: DADOS PESSOAIS === */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Seus dados</h2>
            <p className="text-xs text-gray-500 mb-5">Pra identificar voce na plataforma</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Joao da Silva Santos"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">CPF</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cpf}
                  onChange={(e) => setCpf(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data de nascimento</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                />
                {birthDate && !isAdult(birthDate) && (
                  <p className="text-xs text-red-500 mt-1">Voce precisa ter 18 anos ou mais</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Telefone</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!step1Valid}
              className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold text-sm transition shadow-lg uppercase tracking-wide"
            >
              Continuar
            </button>
          </div>
        )}

        {/* === STEP 2: PAYOUT METHOD === */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Como voce quer receber?</h2>
            <p className="text-xs text-gray-500 mb-5">Voce pode pular e adicionar depois nas configuracoes</p>

            {/* Toggle banco / pix */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <button
                onClick={() => setPayoutMethod("bank")}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition ${
                  payoutMethod === "bank"
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Conta bancaria
                <div className="text-[10px] font-normal opacity-70 mt-0.5">D+1</div>
              </button>
              <button
                onClick={() => setPayoutMethod("pix")}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold transition ${
                  payoutMethod === "pix"
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                Chave PIX
                <div className="text-[10px] font-normal opacity-70 mt-0.5">Instantaneo</div>
              </button>
            </div>

            {/* Form bancario */}
            {payoutMethod === "bank" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Banco</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="Ex: Nubank, Itau, Bradesco..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Agencia</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bankAgency}
                      onChange={(e) => setBankAgency(e.target.value.replace(/\D/g, ""))}
                      placeholder="0000"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Conta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value.replace(/[^\d-]/g, ""))}
                      placeholder="00000-0"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de conta</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBankAccountType("checking")}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                        bankAccountType === "checking"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Corrente
                    </button>
                    <button
                      onClick={() => setBankAccountType("savings")}
                      className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                        bankAccountType === "savings"
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      Poupanca
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Form PIX */}
            {payoutMethod === "pix" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tipo de chave</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["cpf", "email", "phone", "random"] as PixKeyType[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setPixKeyType(t)}
                        className={`py-2 rounded-lg text-[11px] font-semibold transition ${
                          pixKeyType === t ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {t === "cpf" ? "CPF" : t === "email" ? "Email" : t === "phone" ? "Telefone" : "Aleatoria"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Chave PIX</label>
                  <input
                    type="text"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    placeholder={
                      pixKeyType === "cpf"
                        ? "000.000.000-00"
                        : pixKeyType === "email"
                          ? "voce@email.com"
                          : pixKeyType === "phone"
                            ? "+55 11 90000-0000"
                            : "00000000-0000-0000-0000-000000000000"
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 transition outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Aviso pular */}
            {!payoutMethod && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                Voce pode pular este passo, mas vai precisar adicionar dados de recebimento antes de sacar saldo.
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm transition hover:bg-gray-200"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !step2Valid}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 disabled:from-gray-200 disabled:to-gray-300 disabled:text-gray-400 text-white font-bold text-sm transition shadow-lg uppercase tracking-wide"
              >
                {loading ? "Criando..." : payoutMethod ? "Criar conta" : "Pular e criar"}
              </button>
            </div>
          </div>
        )}

        {/* === STEP 3: SUCESSO === */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-8 shadow-xl text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta criada!</h2>
            <p className="text-sm text-gray-600 mb-6">
              Sua conta MoneyTokPay esta pronta. Agora voce pode continuar usando o MoneyTok normalmente.
            </p>

            {!payoutMethod && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-5 text-left">
                <strong>Lembrete:</strong> voce pulou o cadastro de recebimento. Quando quiser sacar saldo, adicione conta bancaria ou PIX nas configuracoes.
              </div>
            )}

            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 text-white font-bold text-sm transition shadow-lg uppercase tracking-wide"
            >
              Ir pro dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
