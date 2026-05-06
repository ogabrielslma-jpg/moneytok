"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { generateListingTitle, RARITIES, PLACEHOLDER_IMAGES } from "@/lib/fake-data";
import { DEFAULT_LANDING_CONFIG, type LandingConfig, type ViewportConfig, sanitizeRichHtml } from "@/lib/landing-config";
import LandingBanner from "@/components/SimulationBanner";

type Step =
  | "upload"      // foto + nome + email (volta ao original)
  | "submitted"   // "foto enviada"
  | "q1" | "q2" | "q3" | "q4" | "q5"  // 5 perguntas
  | "birthdate"
  | "credentials" // senha + username
  | "done";       // redireciona pro login

const FAQS = [
  {
    q: "Como funciona?",
    a: "Você envia a foto do seu pé no formulário acima e recebe propostas de compra de algum dos nossos 43.730 usuários compradores. Tempo de venda estimado é de 2 até 15 minutos.",
  },
  {
    q: "Como eu vou receber o pagamento?",
    a: "Dentro da plataforma você cadastra uma conta bancária e uma chave pix. Os pagamentos caem na conta dentro de 15 minutos após a venda. Exceto aos domingos e feriados o qual esse tempo pode levar até 60 minutos.",
  },
  {
    q: "Regras da plataforma. Leia com atenção!",
    a: "Os compradores querem exclusividade, ou seja, você vai receber uma vez por uma foto vendida. Para fazer mais de uma venda, é necessário enviar outra foto do seu pé!",
  },
];

export default function Home({ initialConfig }: { initialConfig: LandingConfig }) {
  const [step, setStep] = useState<Step>("upload");

  // Tela 1
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");

  // Perguntas (q1-q5)
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Birthdate
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Username availability
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeBuyers, setActiveBuyers] = useState(43730);
  const [config] = useState<LandingConfig>(initialConfig);
  const [isMobile, setIsMobile] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Verificação de disponibilidade do username (debounced 500ms)
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameStatus(username.length === 0 ? "idle" : "invalid");
      return;
    }

    setUsernameStatus("checking");
    const handler = setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .maybeSingle();

        if (error) {
          console.error("[Username Check] erro:", error.message);
          setUsernameStatus("idle");
          return;
        }

        setUsernameStatus(data ? "taken" : "available");
      } catch (e) {
        console.error("[Username Check] exception:", e);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [username, supabase]);

  // Config visual de acordo com o viewport
  const viewport: ViewportConfig = isMobile ? config.mobile : config.desktop;

  useEffect(() => {
    const i = setInterval(() => {
      setActiveBuyers((c) => c + Math.floor(Math.random() * 7) - 3);
    }, 8000);
    return () => clearInterval(i);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  // Submit da tela 1: foto + nome + email
  function handleSubmitInitial(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !firstName || !email) return;
    setStep("submitted");
    // Auto-avança pra primeira pergunta após 2.5s
    setTimeout(() => setStep("q1"), 2500);
  }

  // Avança pra próxima pergunta ou pra birthdate (volta ao fluxo original)
  function answerQuestion(questionId: string, value: string) {
    setAnswers((a) => ({ ...a, [questionId]: value }));
    const order: Step[] = ["q1", "q2", "q3", "q4", "q5", "birthdate"];
    const idx = order.indexOf(step as Step);
    if (idx >= 0 && idx < order.length - 1) {
      setStep(order[idx + 1]);
    }
  }

  function handleBirthdate(e: React.FormEvent) {
    e.preventDefault();
    if (!day || !month || !year) return;
    // Valida idade mínima (18+)
    const birth = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const age = (Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18) {
      setError("Você precisa ter 18+ anos para usar a plataforma.");
      return;
    }
    setError("");
    setStep("credentials");
  }

  // Submit final: cria conta + faz upload + cria listing
  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (username.length < 3) {
      setError("O username precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("Esse username já está em uso. Escolha outro.");
      return;
    }
    if (usernameStatus === "checking") {
      setError("Aguarde a verificação do username terminar.");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setError("Telefone inválido. Use DDD + número (10 ou 11 dígitos).");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Re-verifica username antes de criar (race condition)
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (existing) {
        setError("Esse username acabou de ser pego. Escolha outro.");
        setUsernameStatus("taken");
        setLoading(false);
        return;
      }

      // 1. Cria conta no Supabase
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        phone: phoneDigits ? `+55${phoneDigits}` : undefined,
        options: { data: { username, first_name: firstName, phone: phoneDigits } },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Erro ao criar conta");

      // 2. Faz login (aguarda terminar pra sessão estar disponível)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) console.error("[Auth] Erro no login:", signInError.message);

      // 3. Upload da foto
      let imageUrl = PLACEHOLDER_IMAGES[Math.floor(Math.random() * PLACEHOLDER_IMAGES.length)];
      let uploadOk = false;
      if (file) {
        // Sanitiza nome do arquivo (evita caracteres problemáticos)
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${signUpData.user.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("feet-photos")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || "image/jpeg",
          });
        if (uploadError) {
          console.error("[Upload] Falhou:", uploadError.message);
          setError(`Não foi possível enviar a foto: ${uploadError.message}. Tentando de novo...`);
        } else {
          const { data: urlData } = supabase.storage.from("feet-photos").getPublicUrl(fileName);
          imageUrl = urlData.publicUrl;
          uploadOk = true;
          console.log("[Upload] OK:", imageUrl);
        }
      }
      if (!uploadOk) {
        console.warn("[Upload] Usando imagem placeholder");
      }

      // 4. Atualiza profile com username
      try {
        await supabase.from("profiles").update({ username }).eq("id", signUpData.user.id);
      } catch {}

      // 5. Cria listagem
      const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)];
      const startPrice = 100 * rarity.multiplier + Math.floor(Math.random() * 500);

      await supabase.from("listings").insert({
        seller_id: signUpData.user.id,
        title: generateListingTitle(),
        description: `Tatuagem: ${answers.q1} | Esmalte: ${answers.q2} | Formato: ${answers.q3} | Tamanho: ${answers.q4} | Cuidados: ${answers.q5}`,
        image_url: imageUrl,
        starting_price: startPrice,
        current_bid: startPrice,
        rarity: rarity.label.toLowerCase(),
      });

      // Salva senha pra auto-fill no login
      try { localStorage.setItem(`ff_pwd_${email}`, password); } catch {}

      setStep("done");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: any) {
      setError(err.message || "Algo deu errado");
      setLoading(false);
    }
  }

  // Container e Progress estão definidos como componentes externos no final do arquivo

  // ============ TELA 1: UPLOAD + NOME + EMAIL ============
  if (step === "upload") {
    const alignText =
      viewport.logo_align === "left" ? "text-left" :
      viewport.logo_align === "right" ? "text-right" :
      "text-center";
    return (
      <>
        <Wrapper showLoginLink config={config} viewport={viewport} banner={<LandingBanner config={config} />}>
          <p className={`font-mono text-[10px] uppercase tracking-[0.4em] mb-6 ${alignText}`} style={{ color: config.color_primary }}>
            {config.tagline}
          </p>
          {config.logo_mode === "image" && config.logo_image_url ? (
            <div className={`mb-3 flex ${
              viewport.logo_align === "left" ? "justify-start" :
              viewport.logo_align === "right" ? "justify-end" :
              "justify-center"
            }`}>
              <img
                src={config.logo_image_url}
                alt="logo"
                style={{
                  height: `${viewport.logo_size * 0.7}px`,
                  maxWidth: "100%",
                  objectFit: "contain",
                }}
              />
            </div>
          ) : (
            <div className={`mb-3 ${alignText}`}>
              <div className="font-display tracking-[0.15em] leading-none mb-1" style={{ color: config.color_primary, fontSize: `${viewport.logo_size * 0.6}px` }}>{config.logo_primary}</div>
              <div className="font-display tracking-[0.4em] text-bone-100 leading-none" style={{ fontSize: `${viewport.logo_size * 0.3}px` }}>{config.logo_secondary}</div>
            </div>
          )}
          <p
            className="text-bone-100/70 mt-8 mb-8"
            style={{
              fontSize: `${config.headline_size}px`,
              fontWeight: config.headline_weight,
              textAlign: config.headline_align,
              lineHeight: 1.4,
            }}
            dangerouslySetInnerHTML={{
              __html: sanitizeRichHtml(config.headline_html || config.headline),
            }}
          />

          <form onSubmit={handleSubmitInitial} className="space-y-3">
            <label className="block cursor-pointer group">
              <div className={`bg-ink-900/80 backdrop-blur-sm border-2 border-dashed rounded-2xl px-6 py-8 text-center transition ${preview ? "border-moss-700" : "border-ink-700 hover:border-ink-600"}`}>
                {preview ? (
                  <div className="flex items-center gap-4">
                    <img src={preview} alt="" className="w-14 h-14 object-cover rounded-lg" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-xs text-moss-400 font-mono uppercase tracking-wider mb-1">✓ Foto carregada</div>
                      <div className="text-xs text-bone-100/60 truncate">{file?.name}</div>
                    </div>
                    <span onClick={(e) => { e.preventDefault(); setFile(null); setPreview(null); }}
                      className="text-xs text-ink-600 hover:text-bone-100 cursor-pointer">Trocar</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-7 h-7 mx-auto mb-3 text-bone-100/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <div className="text-bone-100/90 text-base">Escolher arquivo</div>
                  </>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>

            <input type="text" required placeholder="Seu primeiro nome" value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />

            <input type="email" required placeholder="Seu e-mail" value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />

            <button type="submit" disabled={!file || !firstName || !email}
              className="w-full bg-moss-500 hover:bg-moss-400 disabled:bg-ink-700 disabled:cursor-not-allowed text-ink-950 disabled:text-ink-600 py-5 rounded-2xl transition tracking-wide uppercase"
              style={{
                backgroundColor: file && firstName && email ? config.color_primary : undefined,
                fontSize: `${config.cta_size}px`,
                fontWeight: config.cta_weight,
              }}>
              {config.cta_text}
            </button>
          </form>

          <div className="text-center mt-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-600 mb-2">Perguntas frequentes</p>
            <svg className="w-4 h-4 mx-auto text-ink-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </Wrapper>

        <section className="relative bg-ink-950 py-24 px-6">
          <div className="max-w-md mx-auto">
            <h2 className="text-center font-display text-3xl text-bone-100 mb-10">
              Perguntas <span className="italic-accent text-moss-500">frequentes</span>
            </h2>
            <div className="space-y-3">
              {config.faqs.map((faq, i) => (
                <div key={i} className={`border rounded-2xl transition-all ${openFaq === i ? "border-moss-700 bg-ink-900/80" : "border-ink-800 bg-ink-900/40"}`}>
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <span className={`text-base ${openFaq === i ? "text-bone-100" : "text-bone-100/80"}`}>{faq.q}</span>
                    <svg className={`w-4 h-4 text-bone-100/60 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4 text-bone-100/70 leading-relaxed text-sm font-light animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center mt-20">
              <div className="font-display text-3xl tracking-[0.15em] text-moss-500 leading-none mb-1" style={{ color: config.color_primary }}>{config.logo_primary}</div>
              <div className="font-display text-base tracking-[0.4em] text-bone-100/60 leading-none">{config.logo_secondary}</div>
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-600 mt-6">© 2026 — Foot Priv</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  // ============ TELA 2: SUBMITTED (loading) ============
  if (step === "submitted") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 border-4 border-moss-700/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-moss-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-moss-500 mb-3">
            Sua foto está no leilão
          </p>
          <h2 className="font-display text-3xl text-bone-100 mb-4">
            Enviando para os <span className="italic-accent text-moss-500">compradores...</span>
          </h2>
          <p className="text-bone-100/60 text-sm">
            Enquanto isso, complete seu cadastro<br/>para receber os lances.
          </p>
        </div>
      </Wrapper>
    );
  }

  // ============ TELAS DE PERGUNTAS (q1-q5) ============
  const questionIndex = ["q1", "q2", "q3", "q4", "q5"].indexOf(step as string);
  if (questionIndex >= 0) {
    const q = config.questions[questionIndex] || config.questions[0];
    if (!q) return null;
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={questionIndex + 1} total={7} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-moss-500 mb-3">
          Pergunta {questionIndex + 1} de {config.questions.length}
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2 leading-tight">
          {q.title}
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">{q.subtitle}</p>

        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={`${q.id}-opt-${i}`}
              onClick={() => answerQuestion(q.id, opt.text)}
              className="w-full bg-ink-900/80 border border-ink-700 hover:bg-ink-900 rounded-2xl px-6 py-4 text-bone-100 text-left transition group flex items-center gap-3"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: opt.color,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = opt.color; }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.borderLeftColor = opt.color;
              }}
            >
              {opt.emoji && (
                <span className="text-2xl flex-shrink-0">{opt.emoji}</span>
              )}
              <span className="text-base flex-1">{opt.text}</span>
              <span className="text-ink-600 group-hover:text-bone-100 transition" style={{ color: undefined }}>→</span>
            </button>
          ))}
        </div>
      </Wrapper>
    );
  }

  // ============ TELA: BIRTHDATE ============
  if (step === "birthdate") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={6} total={7} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-moss-500 mb-3">
          Quase lá
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2 leading-tight">
          Sua <span className="italic-accent text-moss-500">data de nascimento</span>
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">
          Apenas maiores de 18 anos podem vender.
        </p>

        <form onSubmit={handleBirthdate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <input type="number" min="1" max="31" required placeholder="Dia" value={day}
              onChange={(e) => setDay(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none text-center text-base" />
            <input type="number" min="1" max="12" required placeholder="Mês" value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none text-center text-base" />
            <input type="number" min="1900" max="2010" required placeholder="Ano" value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-4 py-4 text-bone-100 placeholder-ink-600 focus:outline-none text-center text-base" />
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 text-sm rounded-2xl">{error}</div>
          )}

          <button type="submit"
            className="w-full bg-moss-500 hover:bg-moss-400 text-ink-950 font-bold py-5 rounded-2xl transition uppercase tracking-wide">
            Continuar
          </button>
        </form>
      </Wrapper>
    );
  }

  // ============ TELA: CREDENTIALS (username + senha) ============
  if (step === "credentials") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <Progress current={7} total={7} />
        <p className="text-center font-mono text-[10px] uppercase tracking-[0.3em] text-moss-500 mb-3">
          Última etapa
        </p>
        <h2 className="text-center font-display text-3xl text-bone-100 mb-2">
          Crie sua <span className="italic-accent text-moss-500">conta</span>
        </h2>
        <p className="text-center text-bone-100/60 text-sm mb-8">
          Para acessar a plataforma e ver seus lances.
        </p>

        <form onSubmit={handleFinalSubmit} className="space-y-3">
          {/* Email com opção de trocar */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[0.2em] text-ink-600 mb-2 px-2">E-mail</label>
            {editingEmail ? (
              <input type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEditingEmail(false)}
                autoFocus
                className="w-full bg-ink-900/80 border border-moss-700 rounded-2xl px-6 py-4 text-bone-100 focus:outline-none text-base" />
            ) : (
              <div className="bg-ink-900/40 border border-ink-800 rounded-2xl px-6 py-4 flex items-center justify-between">
                <span className="text-bone-100/80 text-sm truncate">{email}</span>
                <button type="button" onClick={() => setEditingEmail(true)}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-moss-500 hover:text-moss-400 transition flex-shrink-0 ml-3">
                  Trocar
                </button>
              </div>
            )}
          </div>

          {/* Username com verificação */}
          <div>
            <div className="relative">
              <input type="text" required minLength={3} placeholder="Username (ex: pearlsoles_official)" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className={`w-full bg-ink-900/80 border rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base ${
                  usernameStatus === "taken" ? "border-red-700 focus:border-red-600" :
                  usernameStatus === "available" ? "border-moss-500 focus:border-moss-400" :
                  "border-ink-700 focus:border-moss-700"
                }`} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <div className="w-5 h-5 border-2 border-moss-700 border-t-moss-400 rounded-full animate-spin"></div>
                )}
                {usernameStatus === "available" && (
                  <svg className="w-5 h-5 text-moss-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {usernameStatus === "taken" && (
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            {usernameStatus === "checking" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mt-1.5 px-2">Verificando disponibilidade...</p>
            )}
            {usernameStatus === "available" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-moss-400 mt-1.5 px-2">✓ Username disponível</p>
            )}
            {usernameStatus === "taken" && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 mt-1.5 px-2">✕ Esse username já está em uso</p>
            )}
            {usernameStatus === "invalid" && username.length > 0 && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-500 mt-1.5 px-2">Mínimo 3 caracteres</p>
            )}
          </div>

          {/* Telefone */}
          <input type="tel" required placeholder="Celular com DDD (ex: 11 98765-4321)" value={phone}
            onChange={(e) => {
              // Formata enquanto digita
              const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
              let formatted = digits;
              if (digits.length >= 2) formatted = `${digits.slice(0, 2)} ${digits.slice(2)}`;
              if (digits.length >= 7) formatted = `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
              setPhone(formatted);
            }}
            className="w-full bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-6 py-4 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />

          {/* Senha com olho */}
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required minLength={6} placeholder="Senha (mín. 6 caracteres)" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-bone-100 transition p-1">
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Confirmar senha com olho */}
          <div className="relative">
            <input type={showConfirmPassword ? "text" : "password"} required placeholder="Confirmar senha" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-ink-900/80 border border-ink-700 focus:border-moss-700 rounded-2xl px-6 py-4 pr-12 text-bone-100 placeholder-ink-600 focus:outline-none transition text-base" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-bone-100 transition p-1">
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-950/40 border border-red-900 text-red-300 px-4 py-3 text-sm rounded-2xl">{error}</div>
          )}

          <button type="submit" disabled={loading || usernameStatus === "taken" || usernameStatus === "checking"}
            className="w-full bg-moss-500 hover:bg-moss-400 disabled:bg-ink-700 disabled:cursor-not-allowed text-ink-950 font-bold py-5 rounded-2xl transition uppercase tracking-wide">
            {loading ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
      </Wrapper>
    );
  }

  // ============ TELA: DONE (redirecting) ============
  if (step === "done") {
    return (
      <Wrapper config={config} viewport={viewport}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-8 bg-moss-500 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-ink-950" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-3xl text-bone-100 mb-4">
            Conta <span className="italic-accent text-moss-500">criada!</span>
          </h2>
          <p className="text-bone-100/60 text-sm">
            Redirecionando para o login...
          </p>
        </div>
      </Wrapper>
    );
  }

  return null;
}

// === Componentes externos (definidos fora pra não recriar a cada render) ===

function Wrapper({
  children,
  showLoginLink = false,
  config = DEFAULT_LANDING_CONFIG,
  viewport = DEFAULT_LANDING_CONFIG.desktop,
  banner,
}: {
  children: React.ReactNode;
  showLoginLink?: boolean;
  config?: LandingConfig;
  viewport?: ViewportConfig;
  banner?: React.ReactNode;
}) {
  const hasImage = !!config.background_image_url;
  const gradientBg = `radial-gradient(ellipse at top, ${config.color_bg_from} 0%, ${config.color_bg_via} 60%, ${config.color_bg_to} 100%)`;
  return (
    <>
      {banner}
      <section className="relative min-h-screen flex flex-col items-center justify-center py-16 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Gradiente base */}
          <div className="absolute inset-0" style={{ background: gradientBg }} />

          {/* Imagem de fundo */}
          {hasImage && (
            <>
              <img
                src={config.background_image_url}
                alt=""
                className="absolute inset-0 w-full h-full"
                style={{
                  objectFit: viewport.background_fit === "auto" ? "none" : viewport.background_fit,
                  objectPosition: `${viewport.background_position_x}% ${viewport.background_position_y}%`,
                  transform: `scale(${viewport.background_size / 100})`,
                  transformOrigin: `${viewport.background_position_x}% ${viewport.background_position_y}%`,
                }}
              />
              <div
                className="absolute inset-0 bg-black"
                style={{ opacity: viewport.background_overlay_opacity / 100 }}
              />
            </>
          )}

          {/* Glow primary */}
          <div className="absolute inset-0" style={{
            background: `radial-gradient(circle at 50% 40%, ${config.color_primary}10 0%, transparent 60%)`,
          }} />
        </div>

        <div className="absolute top-8 left-0 right-0 px-6 flex items-center justify-between max-w-md mx-auto z-20">
          <Link href="/" className="flex items-baseline gap-1.5">
            {config.logo_mode === "image" && config.logo_image_url ? (
              <img src={config.logo_image_url} alt="logo" style={{ height: 24, objectFit: "contain" }} />
            ) : (
              <>
                <span className="font-display text-lg tracking-[0.15em]" style={{ color: config.color_primary }}>{config.logo_primary}</span>
                <span className="font-display text-xs tracking-[0.4em] text-bone-100">{config.logo_secondary}</span>
              </>
            )}
          </Link>
          {showLoginLink && (
            <Link href="/login" className="font-mono text-[10px] uppercase tracking-[0.25em] text-bone-100/60 hover:text-bone-100 transition">
              Entrar
            </Link>
          )}
        </div>

        <div className="relative z-10 w-full max-w-md mx-auto pt-8">
          {children}
        </div>
      </section>
    </>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all ${i === current - 1 ? "w-8 bg-moss-500" : i < current - 1 ? "w-4 bg-moss-700" : "w-4 bg-ink-700"}`}
        />
      ))}
    </div>
  );
}
