"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  randomBidder,
  randomBidIncrementBRL,
  brlToLocal,
  RARITIES,
  PLACEHOLDER_IMAGES,
  FAKE_SHEIKS,
  generateListingTitle,
  type Sheik,
} from "@/lib/fake-data";
import type { LandingConfig, FeedPost } from "@/lib/landing-config";

type Tab = "feed" | "my-auction" | "wallet" | "profile";

type Bid = {
  id: string;
  bidder_name: string;
  bidder_avatar: string;
  emirate: string;
  country: string;
  flag: string;
  currency: string;
  currencyRate: number;
  amount_brl: number;
  created_at: string;
};

type Notification = {
  id: string;
  bidder_name: string;
  flag: string;
  amount_brl: number;
};

type FeedSale = {
  id: string;
  seller_username: string;
  seller_avatar: string;
  buyer_name: string;
  buyer_emirate: string;
  buyer_flag: string;
  amount_brl: number;
  image_url: string;
  rarity: string;
  time_ago: string;
  bids_count: number;
};

type RankUser = {
  rank: number;
  username: string;
  avatar: string;
  total_sales: number;
  total_earned_brl: number;
  total_bids: number;
};

// Leilão histórico (concluído)
type PastAuction = {
  id: string;
  image_url: string;
  rarity: string;
  final_amount_brl: number;
  buyer: Sheik;
  bids: Bid[];
  ended_at: string;
};

const PLATFORM_FEE = 0.10;

// Configuração dos lances: o primeiro lance começa baixo e cresce até o teto
const FIRST_BID_MIN = 50;     // primeiro lance entre R$ 50 e R$ 200
const FIRST_BID_MAX = 200;
const MAX_BID_FLOOR = 311.90; // último lance entre R$ 311,90 e R$ 420
const MAX_BID_CEIL = 420;
const TOTAL_BIDS_MIN = 10;    // total de lances entre 10 e 17 por leilão
const TOTAL_BIDS_MAX = 17;

const MIN_BID = FIRST_BID_MIN; // mantém retrocompatibilidade

const PLANS_DATA: Record<"starter" | "creator" | "super", { name: string; yearly: number; fee: number }> = {
  starter: { name: "Creator", yearly: 79, fee: 10 },
  creator: { name: "Creator Advanced", yearly: 99, fee: 8 },
  super: { name: "Top Creator", yearly: 109, fee: 4 },
};

// Hash determinístico do listing.id pra valores estáveis
function hashListing(listingId: string): number {
  let hash = 0;
  for (let i = 0; i < listingId.length; i++) {
    hash = ((hash << 5) - hash + listingId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Configuração de leilão derivada do listing.id (mesma config sempre pra mesma foto)
function auctionConfig(listingId: string): {
  firstBid: number;        // valor do 1º lance (R$ 50-200)
  finalBid: number;        // valor do último lance (R$ 311,90-420)
  totalBids: number;       // quantos lances no total (10-17)
} {
  const h = hashListing(listingId);
  // Usa diferentes "fatias" do hash pra cada valor (independência)
  const firstBid = FIRST_BID_MIN + ((h % 15000) / 15000) * (FIRST_BID_MAX - FIRST_BID_MIN);
  const finalBid = MAX_BID_FLOOR + (((h >> 8) % 10000) / 10000) * (MAX_BID_CEIL - MAX_BID_FLOOR);
  const totalBids = TOTAL_BIDS_MIN + ((h >> 16) % (TOTAL_BIDS_MAX - TOTAL_BIDS_MIN + 1));
  return {
    firstBid: Math.round(firstBid * 100) / 100,
    finalBid: Math.round(finalBid * 100) / 100,
    totalBids,
  };
}

// Calcula valor do bid #idx de #total — distribuição não-linear (curva natural)
function bidValueAt(idx: number, total: number, firstBid: number, finalBid: number): number {
  if (idx === 0) return firstBid;
  if (idx >= total - 1) return finalBid;

  const progress = idx / (total - 1); // 0 a 1
  // Adiciona pequeno jitter pra parecer natural (±5% no progresso)
  const jitter = (Math.random() - 0.5) * 0.08;
  const adjustedProgress = Math.max(0.01, Math.min(0.99, progress + jitter));

  // Curva levemente convexa (lances aceleram no fim) — exponencial suave
  const curved = Math.pow(adjustedProgress, 0.85);
  const value = firstBid + curved * (finalBid - firstBid);
  return Math.round(value * 100) / 100;
}

// Embaralha array (Fisher-Yates) — usado pra ordem dos bidders
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Mantém compat: maxBidFor retorna o último lance pra qualquer chamada existente
function maxBidFor(listingId: string): number {
  return auctionConfig(listingId).finalBid;
}

const UPLOAD_COOLDOWN_HOURS = 2;

const FAKE_USERNAMES = [
  "pearlsoles_official", "moonlit_pedals", "saharan_silk",
  "honey_heels", "velvet_arches", "desert_rose_88",
  "marble_toes_x", "silk_steps", "topaz_ankles",
  "diamond_petals", "royal_imprint", "goddess_pair",
];

const FAKE_COMMENTS = [
  // Português
  "Lindíssima! 😍",
  "Que cuidado impecável...",
  "Lance subindo rápido nessa!",
  "Inspiração total ✨",
  "Os melhores arcos da plataforma",
  "Tô apaixonada nesse bronze",
  "Cada detalhe é uma obra de arte",
  "Mereceu cada centavo!",
  "Já tô esperando o próximo upload",
  "Esse acabamento é coisa de outro nível",
  // Inglês
  "Absolutely stunning 🔥",
  "Worth every dirham",
  "Pristine work, as always",
  "My favorite seller this week",
  "Royalty-tier feet, no doubt",
  "I'd outbid everyone for these",
  "The way they catch the light...",
  "Marble-smooth, exactly as advertised",
  "Top tier craftsmanship",
  "Pure elegance",
  // Árabe
  "ما شاء الله 👑",
  "جميلة جداً",
  "تحفة فنية حقيقية",
  "أفضل ما رأيت",
  "أتطلع إلى الشراء التالي",
  // Francês
  "Magnifique, vraiment",
  "Une œuvre d'art, sincèrement",
  "Élégance pure ✨",
  "Je suis sous le charme",
  "Travail impeccable",
  // Italiano
  "Stupenda, davvero",
  "Capolavoro!",
  "Eleganza assoluta",
  "Il prezzo è giustificato",
  // Espanhol
  "Hermosísima",
  "Una verdadera obra maestra",
  "Vale cada euro",
  "El mejor trabajo del mes",
  // Alemão
  "Wunderschön",
  "Erstklassige Qualität",
  // Reações curtas internacionais
  "🇦🇪 fan club approves",
  "Pharaonic indeed 👑",
  "Saudi gold standard",
  "Dubai approved ⭐",
  "Worth every riyal",
];

// Retorna comentário ESTÁVEL pra uma venda (não muda entre renders).
// Hash simples do id pra escolher um índice fixo do pool.
function commentForSale(saleId: string): string {
  let hash = 0;
  for (let i = 0; i < saleId.length; i++) {
    hash = ((hash << 5) - hash + saleId.charCodeAt(i)) | 0;
  }
  return FAKE_COMMENTS[Math.abs(hash) % FAKE_COMMENTS.length];
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Detecta moeda local pela bandeira do comprador.
// Cada par tem: rate (BRL→local), symbol (prefixo), locale (formatação).
const FLAG_CURRENCY: Record<string, { rate: number; symbol: string; locale: string }> = {
  "🇦🇪": { rate: 0.74, symbol: "AED", locale: "en-US" },     // Emirados
  "🇸🇦": { rate: 0.75, symbol: "SAR", locale: "en-US" },     // Arábia
  "🇶🇦": { rate: 0.73, symbol: "QAR", locale: "en-US" },     // Catar
  "🇰🇼": { rate: 0.061, symbol: "KWD", locale: "en-US" },    // Kuwait
  "🇧🇭": { rate: 0.075, symbol: "BHD", locale: "en-US" },    // Bahrein
  "🇴🇲": { rate: 0.077, symbol: "OMR", locale: "en-US" },    // Omã
  "🇺🇸": { rate: 0.20, symbol: "USD", locale: "en-US" },     // EUA
  "🇬🇧": { rate: 0.16, symbol: "GBP", locale: "en-GB" },     // UK
  "🇪🇺": { rate: 0.18, symbol: "EUR", locale: "de-DE" },     // EU
  "🇫🇷": { rate: 0.18, symbol: "EUR", locale: "fr-FR" },     // França
  "🇮🇹": { rate: 0.18, symbol: "EUR", locale: "it-IT" },     // Itália
  "🇪🇸": { rate: 0.18, symbol: "EUR", locale: "es-ES" },     // Espanha
  "🇩🇪": { rate: 0.18, symbol: "EUR", locale: "de-DE" },     // Alemanha
  "🇨🇭": { rate: 0.17, symbol: "CHF", locale: "de-CH" },     // Suíça
  "🇯🇵": { rate: 30, symbol: "¥", locale: "ja-JP" },          // Japão
};

function fmtSaleAmount(amountBRL: number, flag: string): { value: string; symbol: string } {
  const cfg = FLAG_CURRENCY[flag];
  if (!cfg) {
    return { value: amountBRL.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), symbol: "R$" };
  }
  const local = amountBRL * cfg.rate;
  const decimals = cfg.symbol === "¥" ? 0 : 2;
  return {
    value: local.toLocaleString(cfg.locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
    symbol: cfg.symbol,
  };
}

function fmtCurrency(v: number, currency: string): string {
  return `${currency} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// === Persistência do estado do usuário (Supabase) ===
// Salva no banco pra sincronizar entre dispositivos.

type PersistedState = {
  walletBalance: number;
  hasSold: boolean;
  auctionEnded: boolean;
  currentBidBRL: number;
  bidHistory: any[];
  pastAuctions: any[];
  lastUploadAt: number | null;
  // Persistidos pra não pedir de novo
  savedDoc?: string;
  savedDocType?: "cpf" | "cnpj";
  savedHolderName?: string;
  savedPixKey?: string;
  savedPixKeyType?: "cpf" | "email" | "phone" | "random";
  // Quando a venda foi marcada (pra contagem de 3min do paywall obrigatório)
  soldAt?: number | null;
};

async function loadUserState(supabase: any, userId: string): Promise<PersistedState | null> {
  // Tenta DB primeiro
  try {
    const { data, error } = await supabase
      .from("user_state")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data) {
      console.log("[State] Carregado do banco");
      return (data.data || null) as PersistedState | null;
    }
    if (error) {
      console.warn("[State] Erro ao carregar do banco:", error.message);
    }
  } catch (e: any) {
    console.warn("[State] Falha no banco:", e?.message);
  }

  // Fallback localStorage
  try {
    const raw = localStorage.getItem(`ff_state_${userId}`);
    if (raw) {
      console.log("[State] Carregado do localStorage (fallback)");
      return JSON.parse(raw) as PersistedState;
    }
  } catch {}

  console.log("[State] Sem estado salvo");
  return null;
}

async function saveUserState(supabase: any, userId: string, state: PersistedState): Promise<void> {
  // Salva no localStorage SEMPRE (pra não perder)
  try {
    localStorage.setItem(`ff_state_${userId}`, JSON.stringify(state));
  } catch {}

  // Tenta salvar no banco também
  try {
    const { error } = await supabase
      .from("user_state")
      .upsert(
        {
          user_id: userId,
          data: state,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (error) {
      console.warn("[State] Erro ao salvar no banco:", error.message, "(salvo no localStorage como fallback)");
    }
  } catch (e: any) {
    console.warn("[State] Falha no save:", e?.message);
  }
}

export default function DashboardPage({ initialConfig }: { initialConfig: LandingConfig }) {
  const config = initialConfig;
  const dash = config.dashboard;
  const [tab, setTab] = useState<Tab>("feed");
  const [auctionSubTab, setAuctionSubTab] = useState<"active" | "closed">("active");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Leilão atual
  const [activeListing, setActiveListing] = useState<any>(null);
  const [currentBidBRL, setCurrentBidBRL] = useState(MIN_BID);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [showConfirmPhotoModal, setShowConfirmPhotoModal] = useState(false);

  // ============ SAQUE ============
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  type WithdrawStep = "method" | "details" | "confirm" | "plan" | "pix" | "processing" | "success";
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>("method");
  const [withdrawMethod, setWithdrawMethod] = useState<"pix" | "ted">("pix");
  const [withdrawDocType, setWithdrawDocType] = useState<"cpf" | "cnpj">("cpf");
  const [withdrawDoc, setWithdrawDoc] = useState("");
  const [withdrawHolderName, setWithdrawHolderName] = useState("");
  const [withdrawPixKeyType, setWithdrawPixKeyType] = useState<"cpf" | "phone" | "email" | "random">("cpf");
  const [withdrawPixKey, setWithdrawPixKey] = useState("");
  const [withdrawBankCode, setWithdrawBankCode] = useState("");
  const [withdrawAgency, setWithdrawAgency] = useState("");
  const [withdrawAccount, setWithdrawAccount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [selectedPlanId, setSelectedPlanId] = useState<"starter" | "creator" | "super">("creator");
  const [activeCoupon, setActiveCoupon] = useState<{ id: string; discount_pct: number; expires_at: string } | null>(null);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawNumber, setWithdrawNumber] = useState("");
  // Estados do checkout via gateway (assinatura do plano)
  const [pixQrCode, setPixQrCode] = useState<string>("");
  const [pixKey, setPixKey] = useState<string>("");
  const [pixCopied, setPixCopied] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string>("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoReason, setDemoReason] = useState<string>("");
  const [creatingPix, setCreatingPix] = useState(false);

  function openWithdrawModal() {
    if (walletBalance <= 0) return;
    setWithdrawAmount(walletBalance);
    setWithdrawStep("method");
    setWithdrawError("");
    // Gera número único do saque (6 dígitos)
    setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
    setShowWithdrawModal(true);
  }

  async function nextWithdrawStep() {
    setWithdrawError("");
    if (withdrawStep === "method") {
      setWithdrawStep("details");
    } else if (withdrawStep === "details") {
      // Valida campos
      if (!withdrawDoc || withdrawDoc.length < 11) {
        setWithdrawError(`Informe um ${withdrawDocType === "cpf" ? "CPF" : "CNPJ"} válido.`);
        return;
      }
      if (!withdrawHolderName || withdrawHolderName.trim().length < 3) {
        setWithdrawError("Informe o nome completo do beneficiário.");
        return;
      }
      if (withdrawMethod === "pix") {
        // Se tipo é CPF, copia o doc do titular pra chave PIX (sempre que avança)
        if (withdrawPixKeyType === "cpf") {
          if (!withdrawDoc) {
            setWithdrawError("Informe o CPF do titular acima.");
            return;
          }
          setWithdrawPixKey(withdrawDoc);
        } else if (!withdrawPixKey) {
          setWithdrawError("Informe a chave PIX.");
          return;
        }
      } else {
        if (!withdrawBankCode || !withdrawAgency || !withdrawAccount) {
          setWithdrawError("Preencha todos os dados bancários.");
          return;
        }
      }
      setWithdrawStep("confirm");
    } else if (withdrawStep === "confirm") {
      // Vai pra paywall do plano (ou direto pra success se já tem plano)
      if (!profile?.plan) {
        setWithdrawStep("plan");
      } else {
        setWithdrawStep("processing");
        setTimeout(() => setWithdrawStep("success"), 2000);
      }
    } else if (withdrawStep === "plan") {
      // Selecionou plano — chama gateway para gerar PIX
      setCreatingPix(true);
      setWithdrawError("");
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: selectedPlanId,
            customer_name: withdrawHolderName,
            customer_email: profile?.email || "user@footpriv.com",
            customer_doc: withdrawDoc,
            customer_doc_type: withdrawDocType,
            customer_phone: "",
            coupon_id: activeCoupon?.id || null,
            coupon_discount_pct: activeCoupon?.discount_pct || 0,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Erro ao gerar PIX");
        }
        setPixQrCode(data.qr_code_base64 || "");
        setPixKey(data.pix_key || "");
        setSubscriptionId(data.subscription_id);
        setIsDemoMode(!!data.demo);
        setDemoReason(data.demo_reason || "");
        setWithdrawStep("pix");
      } catch (e: any) {
        setWithdrawError(e?.message || "Erro ao processar pagamento");
      } finally {
        setCreatingPix(false);
      }
    } else if (withdrawStep === "pix") {
      // Confirmação manual após pagamento (ou via polling)
      setWithdrawStep("processing");
      setTimeout(() => {
        setWalletBalance(0);
        setWithdrawStep("success");
      }, 1500);
    }
  }

  function backWithdrawStep() {
    if (withdrawStep === "details") setWithdrawStep("method");
    else if (withdrawStep === "confirm") setWithdrawStep("details");
    else if (withdrawStep === "plan") setWithdrawStep("confirm");
    else if (withdrawStep === "pix") setWithdrawStep("plan");
  }

  // Reset state do leilão (debug/restart)
  async function resetLeilao() {
    if (!confirm("Resetar TUDO? Isso vai apagar saldo, lances, histórico e estado do leilão. Não tem como desfazer.")) return;
    try {
      if (profile?.id) {
        await supabase.from("user_state").delete().eq("user_id", profile.id);
      }
      window.location.reload();
    } catch (e) {
      alert("Erro ao resetar. Tenta de novo.");
    }
  }
  const [hasSold, setHasSold] = useState(false);
  const [soldAt, setSoldAt] = useState<number | null>(null);

  // Aviso temporário ao tentar fechar em soft lockdown
  const [showLockdownWarning, setShowLockdownWarning] = useState(false);

  // Lockdown:
  // - HARD: cupom ativo (47% off) — modal fechado em qualquer ação, ESC ignorado, clique fora ignorado
  // - SOFT: vendeu há 3+ min sem plano — modal pode ser fechado, mas mostra aviso
  const isHardLockdown = !!activeCoupon && !hasActivePlan;
  // Soft lockdown: 2min15s após a usuária selecionar o lance vencedor
  const LOCKDOWN_DELAY_MS = 2 * 60 * 1000 + 15 * 1000; // 2min15s
  const hasSoldOver3Min = !!soldAt && Date.now() - soldAt >= LOCKDOWN_DELAY_MS;
  const isSoftLockdown = !hasActivePlan && hasSoldOver3Min && !isHardLockdown;
  const isLockdown = isHardLockdown; // mantém compat com refs antigas

  function closeWithdrawModal() {
    if (isHardLockdown) {
      console.log("[Lockdown] Modal não pode ser fechado (cupom ativo)");
      return;
    }
    if (isSoftLockdown) {
      console.log("[Lockdown] Soft lock — mostrando aviso");
      setShowLockdownWarning(true);
      setTimeout(() => setShowLockdownWarning(false), 4500);
      return;
    }
    setShowWithdrawModal(false);
  }

  // Modal venda
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [saleStep, setSaleStep] = useState<"verifying" | "debiting" | "success" | null>(null);

  // Histórico de leilões
  const [pastAuctions, setPastAuctions] = useState<PastAuction[]>([]);
  const [openPastAuction, setOpenPastAuction] = useState<PastAuction | null>(null);

  // Notificações (duram 2min agora)
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Online counter
  const [onlineBuyers, setOnlineBuyers] = useState(13247);

  // Upload cooldown
  const [lastUploadAt, setLastUploadAt] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  // Carteira
  const [walletBalance, setWalletBalance] = useState(0);

  // Feed
  const [feedSales, setFeedSales] = useState<FeedSale[]>([]);
  const [ranking, setRanking] = useState<RankUser[]>([]);
  const [likedSales, setLikedSales] = useState<Set<string>>(new Set());

  // Profile editing
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBio, setEditBio] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stateLoaded, setStateLoaded] = useState(false);

  const router = useRouter();
  const supabase = createClient();
  const bidScheduledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingNew, setUploadingNew] = useState(false);

  // Faz upload de nova foto e abre novo leilão
  async function handleNewUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!profile?.id) return;

    // Se está no modal inicial de confirmação, pula validações de cooldown/plano
    // (ela ainda nem confirmou a primeira foto — essa é uma "troca" da foto que ela acabou de subir)
    const isInitialConfirmation = showConfirmPhotoModal;

    if (!isInitialConfirmation) {
      if (!canUpload) {
        alert("Aguarde o cooldown de 2h entre uploads.");
        e.target.value = "";
        return;
      }
      if (!hasActivePlan) {
        alert("Você precisa de um plano ativo pra enviar nova foto.");
        e.target.value = "";
        return;
      }
    }
    if (!file.type.startsWith("image/")) {
      alert("Apenas imagens são aceitas");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("Imagem muito grande (máx 10MB)");
      return;
    }

    setUploadingNew(true);
    try {
      // 1. Upload da imagem
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${profile.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("feet-photos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("feet-photos").getPublicUrl(fileName);
      const imageUrl = urlData.publicUrl;

      // 2. Salva listing nova no banco
      const rarity = RARITIES[Math.floor(Math.random() * RARITIES.length)];
      const title = generateListingTitle();
      const { data: newListing, error: insertError } = await supabase
        .from("listings")
        .insert({
          seller_id: profile.id,
          title,
          image_url: imageUrl,
          rarity: rarity.label.toLowerCase(),
          starting_price: MIN_BID,
          current_bid: MIN_BID,
          bid_count: 0,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // 3. Salva o leilão atual no histórico ANTES de resetar (se já vendeu)
      if (hasSold && activeListing) {
        // Já tá no pastAuctions provavelmente, não precisa fazer nada
      }

      // 4. Reseta estado pro novo leilão
      const initialBid = auctionConfig(String(newListing.id)).firstBid;
      setActiveListing(newListing);
      setCurrentBidBRL(initialBid);
      setBidHistory([]);
      setHasSold(false);
      setAuctionEnded(false);
      setShowFinalModal(false);
      setSelectedBid(null);
      setSaleStep(null);
      setTimeLeft(30 + Math.floor(Math.random() * 16));
      // Só conta cooldown e mostra alert se NÃO for troca inicial
      if (!isInitialConfirmation) {
        setLastUploadAt(Date.now());
        alert("✓ Foto enviada! Novo leilão começou.");
      }
      bidScheduledRef.current = false; // libera lances pra rodar de novo
    } catch (err: any) {
      console.error("[Upload] Falhou:", err);
      alert(`Erro no upload: ${err?.message || "tente novamente"}`);
    } finally {
      setUploadingNew(false);
      // Limpa input pra permitir mesmo arquivo de novo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ============ LOAD INICIAL ============
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).single();
      setProfile(profileData);
      setEditUsername(profileData?.username || "");
      setEditEmail(user.email || "");
      setEditBio(profileData?.bio || "");

      const { data: listingData } = await supabase
        .from("listings").select("*").eq("seller_id", user.id)
        .order("created_at", { ascending: false }).limit(1).single();
      if (listingData) {
        setActiveListing(listingData);

        // Tenta restaurar estado salvo (do banco)
        const saved = await loadUserState(supabase, user.id);
        if (saved) {
          // Restaura tudo
          setWalletBalance(saved.walletBalance ?? 0);
          setHasSold(saved.hasSold ?? false);
          setAuctionEnded(saved.auctionEnded ?? false);
          setCurrentBidBRL(saved.currentBidBRL ?? MIN_BID);
          setBidHistory(saved.bidHistory ?? []);
          setPastAuctions(saved.pastAuctions ?? []);
          setLastUploadAt(saved.lastUploadAt ?? null);
          // Restaura dados de saque persistidos
          if (saved.savedDoc) setWithdrawDoc(saved.savedDoc);
          if (saved.savedDocType) setWithdrawDocType(saved.savedDocType);
          if (saved.savedHolderName) setWithdrawHolderName(saved.savedHolderName);
          if (saved.savedPixKey) setWithdrawPixKey(saved.savedPixKey);
          if (saved.savedPixKeyType) setWithdrawPixKeyType(saved.savedPixKeyType);
          if (saved.soldAt) setSoldAt(saved.soldAt);

          // Se já vendeu OU leilão acabou, timer fica em 0 (não precisa contar)
          if (saved.hasSold || saved.auctionEnded) {
            setTimeLeft(0);
          } else {
            // Restaura timer aleatório (não tem como saber tempo exato)
            setTimeLeft(30 + Math.floor(Math.random() * 16));
          }
        } else {
          // Primeira vez — estado inicial + modal de confirmação da foto
          setCurrentBidBRL(MIN_BID);
          setTimeLeft(30 + Math.floor(Math.random() * 16));
          setShowConfirmPhotoModal(true);
        }
      }
      generateMockData();
      setStateLoaded(true);
      setLoading(false);
    }
    load();
  }, []);

  function generateMockData() {
    // Top creators: deriva dos próprios posts do feed (top 5 por valor)
    const sortedSellers = [...dash.feed_posts]
      .sort((a, b) => b.amount_brl - a.amount_brl)
      .slice(0, 5);
    const newRanking: RankUser[] = sortedSellers.map((p, i) => ({
      rank: i + 1,
      username: p.seller_name,
      avatar: p.seller_avatar_url || `https://i.pravatar.cc/200?u=${p.seller_name}`,
      total_sales: 50 - i * 7,
      total_earned_brl: (50 - i * 7) * (250 + Math.floor(Math.random() * 130)),
      total_bids: (50 - i * 7) * (8 + Math.floor(Math.random() * 6)),
    }));
    setRanking(newRanking);

    // Feed: usa posts customizados do admin
    const sales: FeedSale[] = dash.feed_posts.map((p, i) => ({
      id: p.id,
      seller_username: p.seller_name,
      seller_avatar: p.seller_avatar_url || `https://i.pravatar.cc/200?u=${p.seller_name}`,
      buyer_name: p.buyer_name,
      buyer_emirate: p.buyer_emirate,
      buyer_flag: p.buyer_flag,
      amount_brl: p.amount_brl,
      image_url: p.image_url || PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length],
      rarity: p.rarity,
      time_ago: p.time_ago,
      bids_count: p.bids_count,
    }));
    setFeedSales(sales);
  }

  const [loadingMore, setLoadingMore] = useState(false);

  function loadMoreFeedSales() {
    if (loadingMore) return;
    setLoadingMore(true);
    // Simula carregamento de rede (pra parecer real)
    setTimeout(() => {
      const basePosts = dash.feed_posts;
      if (!basePosts || basePosts.length === 0) {
        setLoadingMore(false);
        return;
      }
      // Embaralha pra parecer que vieram novos
      const shuffled = [...basePosts].sort(() => Math.random() - 0.5);
      const moreOffset = feedSales.length;
      const newSales: FeedSale[] = shuffled.map((p, i) => {
        const hoursAgo = Math.floor((moreOffset + i) / 4) + 1;
        const minsExtra = Math.floor(Math.random() * 59);
        return {
          id: `${p.id}-load-${Date.now()}-${i}`,
          seller_username: p.seller_name,
          seller_avatar: p.seller_avatar_url || `https://i.pravatar.cc/200?u=${p.seller_name}`,
          buyer_name: p.buyer_name,
          buyer_emirate: p.buyer_emirate,
          buyer_flag: p.buyer_flag,
          amount_brl: Math.round((p.amount_brl + (Math.random() - 0.5) * 80) * 100) / 100,
          image_url: p.image_url || PLACEHOLDER_IMAGES[(moreOffset + i) % PLACEHOLDER_IMAGES.length],
          rarity: p.rarity,
          time_ago: `há ${hoursAgo}h ${minsExtra}min`,
          bids_count: p.bids_count + Math.floor(Math.random() * 5),
        };
      });
      setFeedSales((prev) => [...prev, ...newSales]);
      setLoadingMore(false);
    }, 800);
  }

  // ============ TIMER COUNTDOWN ============
  useEffect(() => {
    if (!stateLoaded) return; // espera load completar
    if (!activeListing || auctionEnded || hasSold) return;
    if (timeLeft <= 0) {
      setAuctionEnded(true);
      setShowFinalModal(true);
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stateLoaded, activeListing, timeLeft, auctionEnded, hasSold]);

  // ============ ONLINE BUYERS DINAMICO ============
  useEffect(() => {
    const i = setInterval(() => {
      setOnlineBuyers((prev) => {
        const delta = Math.floor(Math.random() * 80) - 40;
        const next = prev + delta;
        return Math.max(12001, Math.min(15500, next));
      });
    }, 3000);
    return () => clearInterval(i);
  }, []);

  // ============ COOLDOWN UPLOAD ============
  useEffect(() => {
    if (!lastUploadAt) return;
    const i = setInterval(() => {
      const elapsed = Date.now() - lastUploadAt;
      const total = UPLOAD_COOLDOWN_HOURS * 60 * 60 * 1000;
      const remaining = total - elapsed;
      setCooldownRemaining(Math.max(0, remaining));
    }, 1000);
    return () => clearInterval(i);
  }, [lastUploadAt]);

  // ============ POLLING STATUS DO PIX ============
  useEffect(() => {
    if (withdrawStep !== "pix" || !subscriptionId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout?subscription_id=${subscriptionId}`);
        const data = await res.json();
        if (data.status === "paid") {
          clearInterval(interval);

          // 🎯 Google Ads — Evento de conversão (pagamento PIX confirmado)
          try {
            const planAmount = PLANS_DATA[selectedPlanId]?.yearly || 0;
            if (typeof window !== "undefined" && (window as any).gtag) {
              (window as any).gtag("event", "conversion", {
                send_to: "AW-17953773434/6S-OCOvN0KccEPqug_FC",
                transaction_id: subscriptionId,
                value: planAmount,
                currency: "BRL",
              });
              console.log("[GoogleAds] Conversão disparada:", { subscriptionId, value: planAmount });
            }
          } catch (e) {
            console.error("[GoogleAds] Erro ao disparar conversão:", e);
          }

          setWithdrawStep("processing");
          setTimeout(() => {
            setWalletBalance(0);
            setWithdrawStep("success");
          }, 1500);
        }
      } catch {}
    }, 3000); // checa a cada 3s
    return () => clearInterval(interval);
  }, [withdrawStep, subscriptionId]);

  // ============ AUTO-SAVE DO ESTADO ============
  // Persiste no banco (Supabase) sempre que algo importante muda.
  // Throttle de 800ms pra não fazer milhões de saves em sequência.
  useEffect(() => {
    if (!stateLoaded || !profile?.id) return;
    const t = setTimeout(() => {
      saveUserState(supabase, profile.id, {
        walletBalance,
        hasSold,
        auctionEnded,
        currentBidBRL,
        bidHistory,
        pastAuctions,
        lastUploadAt,
        savedDoc: withdrawDoc || undefined,
        savedDocType: withdrawDocType,
        savedHolderName: withdrawHolderName || undefined,
        savedPixKey: withdrawPixKey || undefined,
        savedPixKeyType: withdrawPixKeyType,
        soldAt,
      });
    }, 800);
    return () => clearTimeout(t);
  }, [stateLoaded, profile?.id, walletBalance, hasSold, auctionEnded, currentBidBRL, bidHistory, pastAuctions, lastUploadAt, withdrawDoc, withdrawDocType, withdrawHolderName, withdrawPixKey, withdrawPixKeyType, soldAt]);

  // ============ BUSCA CUPOM ATIVO ============
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("coupons")
          .select("id, discount_pct, expires_at")
          .eq("user_id", profile.id)
          .eq("status", "active")
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          console.log("[Cupom] Ativo:", data);
          setActiveCoupon(data);
          // Pré-seleciona Basic já que o cupom diz "47% no Basic"
          setSelectedPlanId("starter");
        }
      } catch (e) {
        console.error("[Cupom] Erro ao buscar:", e);
      }
    })();
  }, [profile?.id, supabase]);

  // ============ CHECA PLANO ATIVO (subscription paid não expirada) ============
  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("subscriptions")
          .select("id, expires_at")
          .eq("user_id", profile.id)
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!error && data) {
          // Se tem expires_at, valida que não expirou
          const stillValid = !data.expires_at || new Date(data.expires_at).getTime() > Date.now();
          setHasActivePlan(stillValid);
          if (stillValid) console.log("[Plano] Ativo");
        } else {
          setHasActivePlan(false);
        }
      } catch (e) {
        console.error("[Plano] Erro:", e);
      }
    })();
  }, [profile?.id, supabase, hasSold, walletBalance]);

  // ============ LOCKDOWN: cupom ativo OU já vendeu há 3+ min sem plano ============
  // Cupom: trava SEMPRE
  // Vendeu há 3+ min: só trava se NÃO estiver em wallet nem com modal de saque já aberto
  useEffect(() => {
    if (!stateLoaded || hasActivePlan) return;

    // Caso 1: cupom ativo → bloqueia imediatamente (sempre)
    if (activeCoupon) {
      console.log("[Lockdown] Cupom ativo, abrindo paywall");
      setWithdrawAmount(walletBalance);
      if (!withdrawNumber) {
        setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
      }
      setWithdrawStep("plan");
      setWithdrawError("");
      setShowWithdrawModal(true);
      return;
    }

    // Caso 2: já vendeu há 3+ min E não está na aba wallet E modal de saque fechado
    const inSafeArea = tab === "wallet" || showWithdrawModal;
    if (soldAt && Date.now() - soldAt >= LOCKDOWN_DELAY_MS && !inSafeArea) {
      console.log("[Lockdown] Vendeu há 3+ min, fora da carteira → abrindo paywall");
      setWithdrawAmount(walletBalance);
      if (!withdrawNumber) {
        setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
      }
      setWithdrawStep("plan");
      setWithdrawError("");
      setShowWithdrawModal(true);
    }
  }, [stateLoaded, activeCoupon, hasActivePlan, hasSold, soldAt, walletBalance, tab, showWithdrawModal]);

  // Timer pra disparar lockdown 2min15s após selecionar o lance vencedor
  useEffect(() => {
    if (!soldAt || hasActivePlan) return;
    const elapsed = Date.now() - soldAt;
    const remaining = LOCKDOWN_DELAY_MS - elapsed;
    if (remaining <= 0) return; // já passou (será tratado pelo effect acima)
    const timer = setTimeout(() => {
      const inSafeArea = tab === "wallet" || showWithdrawModal;
      if (inSafeArea) {
        console.log("[Lockdown] 2min15s completaram mas em safe area, não interrompe");
        return;
      }
      console.log("[Lockdown] 2min15s após selectWinningBid, abrindo paywall");
      setWithdrawAmount(walletBalance);
      if (!withdrawNumber) {
        setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
      }
      setWithdrawStep("plan");
      setWithdrawError("");
      setShowWithdrawModal(true);
    }, remaining);
    return () => clearTimeout(timer);
  }, [soldAt, hasActivePlan, tab, showWithdrawModal]);

  // Bloqueia ESC global em lockdown (impede fechar via teclado)
  useEffect(() => {
    if (!showWithdrawModal) return;
    function handleKey(e: KeyboardEvent) {
      const inLockdown = !!activeCoupon && !hasActivePlan;
      if (e.key === "Escape" && inLockdown) {
        e.preventDefault();
        e.stopPropagation();
      }
    }
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [showWithdrawModal, activeCoupon, hasActivePlan]);


  function formatCooldown(ms: number): string {
    const totalSec = Math.ceil(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m.toString().padStart(2, "0")}min ${s.toString().padStart(2, "0")}s`;
  }

  // ============ BIDS FAKE + NOTIFICAÇÕES (10-17 lances aleatórios por leilão) ============
  useEffect(() => {
    if (!stateLoaded) return;
    if (!activeListing || auctionEnded || hasSold) return;
    // Não roda enquanto a usuária ainda não confirmou a foto (modal aberto)
    if (showConfirmPhotoModal) return;
    if (bidScheduledRef.current) return;
    bidScheduledRef.current = true;

    const listingId = String(activeListing.id);
    const cfg = auctionConfig(listingId);

    // Embaralha bidders e seleciona N únicos pra esse leilão
    const biddersList = dash.bidders && dash.bidders.length > 0 ? dash.bidders : [];
    const shuffled = shuffle(biddersList).slice(0, cfg.totalBids);

    console.log(`[Leilão] Listing ${listingId} → ${cfg.totalBids} lances, R$ ${cfg.firstBid} → R$ ${cfg.finalBid}`);

    let timeoutId: any;
    let currentIdx = 0;

    // Calcula até onde já chegamos baseado no currentBidBRL salvo
    // Se currentBidBRL > firstBid, significa que já houve lances antes (state restaurado)
    const isResumed = currentBidBRL > cfg.firstBid;
    if (isResumed) {
      // Estima qual seria o índice atual com base no progresso
      const progress = (currentBidBRL - cfg.firstBid) / (cfg.finalBid - cfg.firstBid);
      currentIdx = Math.max(1, Math.floor(progress * cfg.totalBids));
    }

    // Timing: 3s espera inicial. Depois cada lance espera entre 1s e 3s (aleatório real,
    // sem padrão). Pré-sorteamos os delays no início pra cada lance ter um tempo único.
    const INITIAL_DELAY_MS = 3000;
    const MIN_DELAY_BETWEEN_BIDS_MS = 1000;
    const MAX_DELAY_BETWEEN_BIDS_MS = 3000;

    // Pré-sorteia o delay de cada lance (cada um entre 1-3s, independentes)
    const bidDelays: number[] = [];
    for (let i = 0; i < cfg.totalBids; i++) {
      const r = Math.random();
      bidDelays.push(MIN_DELAY_BETWEEN_BIDS_MS + r * (MAX_DELAY_BETWEEN_BIDS_MS - MIN_DELAY_BETWEEN_BIDS_MS));
    }
    console.log(`[Leilão] Delays sorteados:`, bidDelays.map(d => Math.round(d) + "ms"));

    const scheduleNextBid = (isFirst: boolean) => {
      // Se atingiu o total → para
      if (currentIdx >= cfg.totalBids) {
        bidScheduledRef.current = false;
        return;
      }

      // Primeiro lance: 3s espera. Demais: usa o delay pré-sorteado pra esse índice
      const delay = isFirst && !isResumed
        ? INITIAL_DELAY_MS
        : bidDelays[currentIdx] || (MIN_DELAY_BETWEEN_BIDS_MS + Math.random() * 2000);

      timeoutId = setTimeout(() => {
        if (auctionEnded) return;

        const idx = currentIdx;
        currentIdx++;

        // Calcula o valor desse lance (curva natural com jitter)
        const newBid = bidValueAt(idx, cfg.totalBids, cfg.firstBid, cfg.finalBid);

        // Pega o bidder pré-embaralhado
        let bidderName: string, bidderAvatar: string, emirate: string, country: string, flag: string, currency: string, currencyRate: number;
        if (shuffled[idx]) {
          const b = shuffled[idx];
          bidderName = b.name;
          bidderAvatar = b.avatar_url || `https://i.pravatar.cc/150?u=${encodeURIComponent(b.name)}`;
          emirate = b.emirate;
          country = b.country;
          flag = b.flag;
          currency = b.currency;
          currencyRate = b.currency_rate;
        } else {
          // Fallback se admin tiver poucos bidders
          const bidder = randomBidder();
          bidderName = bidder.name;
          bidderAvatar = bidder.avatar;
          emirate = bidder.emirate;
          country = bidder.country;
          flag = bidder.flag;
          currency = bidder.currency;
          currencyRate = bidder.currencyRate;
        }

        const newBidObj: Bid = {
          id: `bid-${Date.now()}-${Math.random()}`,
          bidder_name: bidderName,
          bidder_avatar: bidderAvatar,
          emirate,
          country,
          flag,
          currency,
          currencyRate,
          amount_brl: newBid,
          created_at: new Date().toISOString(),
        };
        setCurrentBidBRL(newBid);
        setBidHistory((h) => [newBidObj, ...h].slice(0, 30));

        // Notificação 4.5s
        const notif: Notification = {
          id: newBidObj.id,
          bidder_name: bidderName,
          flag,
          amount_brl: newBid,
        };
        setNotifications((n) => [notif, ...n].slice(0, 4));
        setTimeout(() => {
          setNotifications((n) => n.filter((x) => x.id !== notif.id));
        }, 4500);

        // Agenda próximo
        scheduleNextBid(false);
      }, delay);
    };
    scheduleNextBid(true);

    return () => {
      clearTimeout(timeoutId);
      bidScheduledRef.current = false;
    };
  }, [stateLoaded, activeListing?.id, auctionEnded, hasSold, showConfirmPhotoModal]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function toggleLike(saleId: string) {
    setLikedSales((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  }

  async function saveProfile() {
    if (!user) return;
    setProfileSaving(true);
    try {
      await supabase.from("profiles").update({
        username: editUsername,
        bio: editBio,
      }).eq("id", user.id);
      setProfile({ ...profile, username: editUsername, bio: editBio });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch {}
    setProfileSaving(false);
  }

  async function changePassword() {
    setPasswordError("");
    if (newPassword.length < 6) {
      setPasswordError("A senha precisa ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }
    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || "Erro ao alterar senha.");
    }
    setPasswordSaving(false);
  }

  function selectWinningBid(bid: Bid) {
    setSelectedBid(bid);
    setSaleStep("verifying");
    setShowFinalModal(false);
    // Marca timestamp do início do lockdown contagem (2min15s a partir daqui)
    setSoldAt(Date.now());
    setTimeout(() => setSaleStep("debiting"), 2200);
    setTimeout(() => {
      setSaleStep("success");
      const liquid = Math.round(bid.amount_brl * (1 - PLATFORM_FEE) * 100) / 100;
      console.log(`[Venda] Lance R$ ${bid.amount_brl} → líquido R$ ${liquid} adicionado à carteira`);
      setWalletBalance((b) => {
        const newBalance = Math.round((b + liquid) * 100) / 100;
        console.log(`[Carteira] Saldo: R$ ${b} → R$ ${newBalance}`);
        return newBalance;
      });
      setHasSold(true);

      // Salva como leilão histórico
      const past: PastAuction = {
        id: `past-${Date.now()}`,
        image_url: activeListing?.image_url || "",
        rarity: activeListing?.rarity || "common",
        final_amount_brl: bid.amount_brl,
        buyer: {
          name: bid.bidder_name,
          emirate: bid.emirate,
          country: bid.country,
          flag: bid.flag,
          currency: bid.currency,
          currencyRate: bid.currencyRate,
        },
        bids: [...bidHistory],
        ended_at: new Date().toISOString(),
      };
      setPastAuctions((p) => [past, ...p]);
      setLastUploadAt(Date.now());
    }, 5800);
  }

  function closeSaleAndGoToWallet() {
    setSaleStep(null);
    setSelectedBid(null);
    setTab("wallet");
    // Sobe a página pro topo (em vez de manter onde estava)
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  function goToTab(t: Tab) {
    setTab(t);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    );
  }

  const rarity = activeListing
    ? RARITIES.find((r) => r.label.toLowerCase() === activeListing.rarity) || RARITIES[0]
    : RARITIES[0];

  const userInitial = (profile?.username || user?.email || "?").charAt(0).toUpperCase();
  // Por padrão mostra inicial. Só usa imagem se user fez upload custom
  const userAvatarUrl = customAvatar;

  const canUpload = !lastUploadAt || cooldownRemaining <= 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* === Notificações flutuantes (2min) === */}
      <div className="fixed top-20 right-4 z-50 space-y-2 max-w-xs w-full pointer-events-none">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-lg pointer-events-auto"
            style={{ animation: "slideInRight 0.3s ease-out" }}
          >
            <div className="text-2xl flex-shrink-0">{n.flag}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-900 truncate font-semibold">{n.bidder_name}</div>
              <div className="text-[11px] text-gray-600">
                ofertou <span className="font-semibold text-emerald-600">R$ {fmtBRL(n.amount_brl)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-screen">
        {/* === SIDEBAR ESQUERDA (DESKTOP) === */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white sticky top-0 h-screen p-6">
          <button onClick={() => goToTab("feed")} className="flex items-baseline gap-2 mb-10 text-left">
            {dash.logo_image_url ? (
              <img src={dash.logo_image_url} alt="logo" style={{ height: dash.logo_size * 0.4, objectFit: "contain" }} />
            ) : (
              <>
                <span className="font-display text-2xl tracking-[0.15em] text-gray-900" style={{ color: dash.color_primary }}>{dash.logo_primary}</span>
                <span className="font-display text-xs tracking-[0.4em] text-gray-500">{dash.logo_secondary}</span>
              </>
            )}
          </button>

          <nav className="flex-1 space-y-1">
            <NavItem active={tab === "feed"} onClick={() => goToTab("feed")} icon="home" label={dash.label_feed} />
            <NavItem active={tab === "my-auction"} onClick={() => goToTab("my-auction")} icon="hammer" label={dash.label_auction}
              badge={!auctionEnded && bidHistory.length > 0 ? String(bidHistory.length) : undefined} />
            <NavItem active={tab === "wallet"} onClick={() => goToTab("wallet")} icon="wallet" label={dash.label_wallet} />
            <NavItem active={tab === "profile"} onClick={() => goToTab("profile")} icon="user" label={dash.label_profile} />
          </nav>

          <div className="border border-gray-200 rounded-2xl p-3 flex items-center gap-3 mt-4">
            <UserAvatar url={userAvatarUrl} initial={userInitial} size={40} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">@{profile?.username || "user"}</div>
              <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-900 transition">Sair</button>
            </div>
          </div>
        </aside>

        {/* === CONTEÚDO CENTRAL === */}
        <main className="flex-1 max-w-2xl mx-auto pb-24 lg:pb-12">
          {/* TOPBAR MOBILE */}
          <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button onClick={() => goToTab("feed")} className="flex items-baseline gap-1.5">
              {dash.logo_image_url ? (
                <img src={dash.logo_image_url} alt="logo" style={{ height: dash.logo_size * 0.28, objectFit: "contain" }} />
              ) : (
                <>
                  <span className="font-display text-lg tracking-[0.15em] text-gray-900" style={{ color: dash.color_primary }}>{dash.logo_primary}</span>
                  <span className="font-display text-[10px] tracking-[0.4em] text-gray-500">{dash.logo_secondary}</span>
                </>
              )}
            </button>
            <button
              onClick={() => goToTab("wallet")}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 transition rounded-full pl-2 pr-3 py-1.5"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6zM7 10V7a4 4 0 118 0v3" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-900 tabular-nums">
                R$ {fmtBRL(walletBalance)}
              </span>
            </button>
          </header>

          {/* === FEED === */}
          {tab === "feed" && (
            <div className="px-0 lg:px-6 lg:pt-6">
              {/* Card "compradores online" + botão upload */}
              <div className="bg-white border-b lg:border lg:rounded-2xl border-gray-200 px-4 py-4 mb-4 lg:mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">{dash.label_buyers_online}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-base font-bold tabular-nums">{onlineBuyers.toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewUpload}
                  className="hidden"
                />
                {(() => {
                  const auctionInProgress = !!activeListing && !hasSold && !auctionEnded;

                  if (auctionInProgress) {
                    return (
                      <button
                        onClick={() => goToTab("my-auction")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition bg-gradient-to-r from-emerald-500 to-[#62C86E] hover:opacity-90 text-white shadow-lg animate-pulse-slow"
                      >
                        <span className="text-base">🔥</span>
                        <span>Sua foto está em leilão. Acompanhe clicando aqui</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      disabled={uploadingNew || !canUpload}
                      onClick={() => {
                        if (uploadingNew || !canUpload) return;
                        if (!hasActivePlan) {
                          // Sem plano = abre paywall direto na tela de plano
                          setWithdrawAmount(walletBalance);
                          setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
                          setWithdrawStep("plan");
                          setWithdrawError("");
                          setShowWithdrawModal(true);
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
                        uploadingNew
                          ? "bg-gray-300 text-gray-500 cursor-wait"
                          : !canUpload
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : !hasActivePlan
                              ? "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white shadow-lg"
                              : "bg-gray-900 hover:bg-black text-white"
                      }`}
                    >
                      {uploadingNew ? (
                        <>
                          <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                          <span>Enviando foto...</span>
                        </>
                      ) : !canUpload ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span className="font-mono tabular-nums">🔒 {formatCooldown(cooldownRemaining)}</span>
                        </>
                      ) : !hasActivePlan ? (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <span>🔒 Fazer upload de nova foto para leilão</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span>Enviar novo upload para leilão</span>
                        </>
                      )}
                    </button>
                  );
                })()}

                <p className="text-[10px] text-gray-500 text-center mt-2 leading-relaxed">
                  {(activeListing && !hasSold && !auctionEnded)
                    ? "ⓘ Lances acontecem automaticamente. Atualize a aba do leilão para acompanhar em tempo real."
                    : !canUpload
                      ? "ⓘ Cooldown de 2h entre uploads pra dar chance a todas as criadoras."
                      : !hasActivePlan
                        ? "ⓘ Apenas creators com plano ativo podem enviar novas fotos."
                        : "ⓘ Uploads liberados a cada 2h para dar chance a todas as criadoras."}
                </p>
              </div>

              {/* Top vendedoras da semana */}
              <div className="bg-white border-b lg:border lg:rounded-2xl border-gray-200 px-4 py-5 mb-4 lg:mb-6">
                <div className="flex items-center justify-between mb-4 px-1">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{dash.label_top_creators}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5">Atualizado a cada 24h</p>
                  </div>
                  <span className="text-xl">🏆</span>
                </div>
                <div className="space-y-3">
                  {ranking.map((u) => (
                    <div key={u.username} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        u.rank === 1 ? "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 shadow-sm" :
                        u.rank === 2 ? "bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800 shadow-sm" :
                        u.rank === 3 ? "bg-gradient-to-br from-orange-300 to-orange-500 text-orange-900 shadow-sm" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {u.rank}
                      </div>
                      <img src={u.avatar} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-white" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-900 truncate">@{u.username}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                            {u.total_sales}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                            {u.total_bids}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-emerald-600 tabular-nums">
                          R$ {fmtBRL(u.total_earned_brl)}
                        </div>
                        <div className="text-[9px] text-gray-400 uppercase tracking-wider">arrecadado</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Posts do feed */}
              <div className="space-y-4 lg:space-y-6">
                {feedSales.map((sale, i) => {
                  const r = RARITIES.find((x) => x.label.toLowerCase() === sale.rarity) || RARITIES[0];
                  // Banner aparece após o 1º post (i===0) e depois a cada 4 (i===4, 8, 12...)
                  const showBannerAfter = i === 0 || (i > 0 && (i + 1) % 4 === 0);
                  return (
                    <div key={sale.id} className="space-y-4 lg:space-y-6">
                    <article className="bg-white border-y lg:border lg:rounded-2xl border-gray-200 overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 flex items-center gap-3">
                        <img src={sale.seller_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">@{sale.seller_username}</div>
                          <div className="text-[10px] text-gray-500">{sale.time_ago}</div>
                        </div>
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full ${
                          r.label === "Pharaonic" ? "bg-emerald-50 text-emerald-700" :
                          r.label === "Legendary" ? "bg-amber-50 text-amber-700" :
                          r.label === "Epic" ? "bg-purple-50 text-purple-700" :
                          r.label === "Rare" ? "bg-blue-50 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {r.label}
                        </span>
                      </div>

                      {/* Imagem */}
                      <div className="relative aspect-square bg-gray-100">
                        <img src={sale.image_url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${dash.feed_blur_intensity}px) ${dash.feed_grayscale ? "grayscale(100%)" : ""}` }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-4 text-center shadow-xl">
                            <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Vendido por</div>
                            {(() => {
                              const f = fmtSaleAmount(sale.amount_brl, sale.buyer_flag);
                              return (
                                <>
                                  <div className="font-display text-3xl text-gray-900 tabular-nums">
                                    R$ {fmtBRL(sale.amount_brl)}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5 tabular-nums">
                                    ≈ {f.symbol} {f.value}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-2 text-gray-700">
                          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                              {sale.bids_count} lances
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          <span className="font-semibold">@{sale.seller_username}</span>{" "}
                          vendeu para{" "}
                          <span className="font-semibold inline-flex items-center gap-1">
                            <span className="text-base">{sale.buyer_flag}</span>
                            {sale.buyer_name}
                          </span>{" "}
                          de {sale.buyer_emirate}
                        </div>
                        <div className="text-xs text-gray-500 mt-2 italic">
                          {commentForSale(sale.id)}
                        </div>
                      </div>
                    </article>
                    {showBannerAfter && <AppBanner />}
                    </div>
                  );
                })}

                {/* Carregar mais (loading perpétuo após primeiro clique) */}
                <div className="px-4 lg:px-0 pt-2 pb-8">
                  <button
                    onClick={() => {
                      // Trava em loading e nunca termina (estratégia: faz a pessoa ativar plano)
                      setLoadingMore(true);
                    }}
                    disabled={loadingMore}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold text-sm transition bg-white border border-gray-200 hover:border-gray-400 text-gray-700 disabled:opacity-60 disabled:cursor-wait"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin"></div>
                        <span>Carregando mais vendas...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>Carregar mais vendas</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === MEUS LEILÕES === */}
          {tab === "my-auction" && (
            <div className="px-4 lg:px-6 pt-6 space-y-4">
              {/* Sub-tabs: Ativo / Fechados */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={!activeListing || hasSold}
                  onClick={() => setAuctionSubTab("active")}
                  className={`bg-white border rounded-2xl p-4 text-left transition ${
                    auctionSubTab === "active" && (activeListing && !hasSold)
                      ? "border-emerald-400 ring-2 ring-emerald-100 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  } ${(!activeListing || hasSold) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{dash.label_active_auction}</span>
                    {activeListing && !hasSold && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>
                  <div className="font-display text-2xl text-gray-900 font-light">
                    {activeListing && !hasSold ? "1" : "0"}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {activeListing && !hasSold ? `Encerra em ${timeLeft}s` : "Nenhum agora"}
                  </p>
                </button>

                <button
                  onClick={() => setAuctionSubTab("closed")}
                  className={`bg-white border rounded-2xl p-4 text-left transition ${
                    auctionSubTab === "closed"
                      ? "border-gray-900 ring-2 ring-gray-100 shadow-sm"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{dash.label_closed_auctions}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="font-display text-2xl text-gray-900 font-light">
                    {pastAuctions.length}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {pastAuctions.length === 0 ? "Nenhum ainda" : `R$ ${fmtBRL(pastAuctions.reduce((sum, p) => sum + p.final_amount_brl, 0))} total`}
                  </p>
                </button>
              </div>

              {/* === LEILÃO ATIVO (sub-tab) === */}
              {auctionSubTab === "active" && activeListing && !hasSold && (
                <>
                  {/* Aviso de horário de pico (leilão rápido) */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-amber-900 leading-snug mb-0.5">Leilão rápido — horário de pico!</p>
                      <p className="text-[11px] text-amber-800 leading-snug">
                        Vários compradores online além do comum. Por isso seu leilão está sendo super rápido.
                      </p>
                    </div>
                  </div>

                <div className="bg-white border-2 border-emerald-300 rounded-2xl overflow-hidden">
                  {/* Header com timer cronômetro */}
                  <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                      <span className="text-xs uppercase tracking-wider text-red-600 font-bold">Ao vivo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-right">
                        <div className="text-[9px] uppercase tracking-wider text-gray-500">Seu leilão acaba em</div>
                        <div className={`text-2xl font-display font-light tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-gray-900"}`}>
                          {timeLeft}s
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Foto + lance */}
                  <div className="relative aspect-square bg-gray-100">
                    <img src={activeListing.image_url} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-3 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full text-gray-900 border border-gray-200">
                      ✦ {rarity.label}
                    </div>
                    <div className="absolute top-3 right-3 bg-amber-50 border border-amber-200 px-3 py-1 text-[9px] font-semibold uppercase tracking-wider rounded-full text-amber-800">
                      ⚠ Vende uma vez só
                    </div>
                  </div>

                  <div className="p-5 border-b border-gray-100">
                    <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Lance atual</p>
                    <div className="font-display text-4xl text-gray-900 tabular-nums font-light">
                      R$ {fmtBRL(currentBidBRL)}
                    </div>
                  </div>

                  {/* Lances ao vivo (em R$) */}
                  <div className="p-5">
                    <h3 className="font-semibold text-base text-gray-900 mb-3 flex items-center justify-between">
                      <span>Lances ao vivo</span>
                      <span className="text-[10px] text-gray-500 font-normal uppercase tracking-wider">
                        {bidHistory.length} ofertas
                      </span>
                    </h3>
                    {bidHistory.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        Aguardando primeiros lances...
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[280px] overflow-y-auto">
                        {bidHistory.map((bid, i) => (
                          <div key={bid.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                            i === 0 ? "bg-emerald-50 border border-emerald-200" : "bg-gray-50"
                          }`}>
                            <img src={bid.bidder_avatar} alt="" className="w-9 h-9 rounded-full grayscale flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-900 truncate font-medium flex items-center gap-1">
                                <span className="text-base">{bid.flag}</span>
                                <span className="truncate">{bid.bidder_name}</span>
                              </div>
                              <div className="text-[10px] uppercase tracking-wider text-gray-500">{bid.emirate}</div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-gray-900 tabular-nums">
                                R$ {fmtBRL(bid.amount_brl)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                </>
              )}

              {/* === LEILÕES FECHADOS (sub-tab) === */}
              {auctionSubTab === "closed" && (
                <div>
                  {pastAuctions.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                      <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <p className="font-semibold text-gray-700 mb-1">Nenhum leilão fechado ainda</p>
                      <p className="text-xs text-gray-500">Suas vendas finalizadas aparecerão aqui.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3 px-1">
                        Histórico ({pastAuctions.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {pastAuctions.map((past) => {
                          const r = RARITIES.find((x) => x.label.toLowerCase() === past.rarity) || RARITIES[0];
                          return (
                            <button
                              key={past.id}
                              onClick={() => setOpenPastAuction(past)}
                              className="bg-white border border-gray-200 rounded-2xl overflow-hidden text-left hover:border-gray-400 transition"
                            >
                              <div className="relative aspect-square bg-gray-100">
                                <img src={past.image_url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${dash.feed_blur_intensity}px) ${dash.feed_grayscale ? "grayscale(100%)" : ""}` }} />
                                <div className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider rounded-full text-gray-900">
                                  {r.label}
                                </div>
                                <div className="absolute bottom-2 right-2 text-2xl">{past.buyer.flag}</div>
                              </div>
                              <div className="p-3">
                                <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Arrematado por</div>
                                <div className="font-display text-lg text-emerald-600 tabular-nums font-semibold">
                                  R$ {fmtBRL(past.final_amount_brl)}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate mt-1">
                                  {past.buyer.name}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Estado vazio na aba "ativo" sem ativo */}
              {auctionSubTab === "active" && (!activeListing || hasSold) && (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-semibold text-gray-700 mb-1">Nenhum leilão ativo agora</p>
                  <p className="text-xs text-gray-500 mb-3">Envie uma nova foto pelo Feed para começar.</p>
                  <button
                    onClick={() => goToTab("feed")}
                    className="text-sm text-gray-900 font-semibold underline underline-offset-4"
                  >
                    Ir pro Feed →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* === CARTEIRA === */}
          {tab === "wallet" && (
            <div className="px-4 lg:px-6 pt-6 pb-8">
              {/* Card principal saldo */}
              <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-7 mb-5 text-white shadow-2xl overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full"></div>
                <div className="absolute -bottom-12 -left-8 w-32 h-32 bg-white/5 rounded-full"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1">Carteira FootPriv</p>
                      <p className="text-xs text-white/70">@{profile?.username || "user"}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6zM7 10V7a4 4 0 118 0v3" />
                      </svg>
                    </div>
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 mb-1.5">Saldo disponível</p>
                  <div className="font-display text-5xl font-light tabular-nums tracking-tight">
                    R$ {fmtBRL(walletBalance)}
                  </div>
                </div>
              </div>

              {/* Stats em grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Vendas</p>
                  <p className="font-display text-2xl text-gray-900 font-semibold">{pastAuctions.length}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Total sacado</p>
                  <p className="font-display text-2xl text-gray-900 font-semibold">R$ 0</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1">Pendente</p>
                  <p className="font-display text-2xl text-gray-900 font-semibold">R$ 0</p>
                </div>
              </div>

              {/* Botão saque */}
              <button
                onClick={openWithdrawModal}
                disabled={walletBalance === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition tracking-wide text-sm flex items-center justify-center gap-2 shadow-md mb-5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {walletBalance > 0 ? "Sacar saldo" : "Sem saldo disponível"}
              </button>

              {/* Card plano atual + taxa */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1">Plano atual</p>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-display text-2xl text-gray-900">Creator</span>
                    </div>
                    <p className="text-xs text-gray-600">Taxa: <span className="font-semibold text-gray-900">10%</span> por venda</p>
                  </div>
                  <div className="bg-gray-100 rounded-full px-3 py-1.5 flex items-center gap-1">
                    <span className="text-base">🪙</span>
                    <span className="text-[10px] uppercase tracking-wider text-gray-700 font-semibold">Iniciante</span>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">📈 Reduza sua taxa</p>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold flex-shrink-0">10%</div>
                        <div className="text-xs text-gray-700 truncate">
                          <span className="font-semibold">Creator</span> — até R$ 12.000 / mês
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">atual</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 opacity-50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">8%</div>
                        <div className="text-xs text-gray-700 truncate">
                          <span className="font-semibold">Creator Advanced</span> — até R$ 48.000 / mês
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">🔒</span>
                    </div>

                    <div className="flex items-center justify-between gap-3 opacity-50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-amber-900 flex items-center justify-center text-xs font-bold flex-shrink-0">4%</div>
                        <div className="text-xs text-gray-700 truncate">
                          <span className="font-semibold">Top Creator</span> — acima de R$ 48.000 / mês
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">⭐</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 text-center mt-3 leading-relaxed">
                  Quanto mais você vende, menos a plataforma cobra.
                </p>
              </div>

              {/* Botão secundário: escolher um plano (abaixo do card de plano) */}
              <button
                onClick={() => {
                  setWithdrawAmount(walletBalance);
                  setWithdrawNumber(Math.floor(100000 + Math.random() * 900000).toString());
                  setWithdrawStep("plan");
                  setWithdrawError("");
                  setShowWithdrawModal(true);
                }}
                className="w-full py-3 rounded-2xl text-sm font-semibold bg-white border border-gray-200 hover:border-gray-400 text-gray-700 transition flex items-center justify-center gap-2 mb-4"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 12V8a4 4 0 00-8 0v4m-2 0h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2z" />
                </svg>
                <span>Escolher um plano</span>
              </button>
            </div>
          )}

          {/* === PERFIL === */}
          {tab === "profile" && (
            <div className="px-4 lg:px-6 pt-6 pb-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4 shadow-sm">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative mb-3">
                    <UserAvatar url={userAvatarUrl} initial={userInitial} size={96} />
                    <label className="absolute -bottom-1 -right-1 bg-gray-900 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-black transition cursor-pointer shadow-lg ring-4 ring-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            if (typeof reader.result === "string") setCustomAvatar(reader.result);
                          };
                          reader.readAsDataURL(f);
                        }} />
                    </label>
                  </div>
                  <h2 className="font-display text-2xl text-gray-900">@{profile?.username || "user"}</h2>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  {!customAvatar && (
                    <p className="text-[11px] text-gray-400 mt-2 text-center">
                      Clique no ícone de câmera para adicionar foto
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Username</label>
                    <input type="text" value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">E-mail</label>
                    <input type="email" value={editEmail} disabled
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Bio</label>
                    <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3}
                      placeholder="Conte algo sobre você..."
                      className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition resize-none" />
                  </div>
                  <button onClick={saveProfile} disabled={profileSaving}
                    className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition text-sm">
                    {profileSaving ? "Salvando..." : profileSaved ? "✓ Salvo" : "Salvar alterações"}
                  </button>
                </div>
              </div>

              {/* Card Plano */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 mb-4 shadow-lg text-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-100 font-bold mb-1">Seu plano atual</p>
                    <h3 className="font-display text-2xl">🪙 Starter</h3>
                  </div>
                  <span className="text-xs bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 font-semibold">10% taxa</span>
                </div>
                <p className="text-xs text-emerald-50/90 mb-4">
                  Suba pro <strong>Super Creator</strong> e pague só <strong>4%</strong> de taxa. Você economiza mais quanto mais vende.
                </p>
                <Link href="/planos"
                  className="block w-full bg-white text-emerald-700 font-bold text-center py-2.5 rounded-xl hover:bg-emerald-50 transition text-sm">
                  Ver planos disponíveis →
                </Link>
              </div>

              {/* Card Segurança */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Segurança</h3>
                <button onClick={() => {
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setPasswordError("");
                  setPasswordSuccess(false);
                  setShowPasswordModal(true);
                }}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 transition rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">Alterar senha</div>
                      <div className="text-[11px] text-gray-500">Atualize a senha da sua conta</div>
                    </div>
                  </div>
                  <span className="text-gray-400">→</span>
                </button>
              </div>

              <button onClick={resetLeilao}
                className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold py-3 rounded-xl transition text-sm border border-amber-200 mb-2">
                🔄 Resetar leilão (debug)
              </button>

              <button onClick={logout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition text-sm border border-red-200">
                Sair da conta
              </button>
            </div>
          )}
        </main>

        {/* === SIDEBAR DIREITA (DESKTOP) === */}
        <aside className="hidden xl:flex flex-col w-80 sticky top-0 h-screen p-6 gap-4 overflow-y-auto">
          <button onClick={() => goToTab("wallet")}
            className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white text-left hover:from-black hover:to-gray-800 transition shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-white/70">Carteira</span>
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6zM7 10V7a4 4 0 118 0v3" />
              </svg>
            </div>
            <div className="font-display text-3xl tabular-nums font-light">
              R$ {fmtBRL(walletBalance)}
            </div>
            <p className="text-[10px] text-white/60 mt-1">Acessar carteira →</p>
          </button>

          {activeListing && !hasSold && !auctionEnded && (
            <button onClick={() => goToTab("my-auction")}
              className="bg-white border border-gray-200 rounded-2xl p-4 text-left hover:border-gray-300 transition">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Seu leilão</span>
                <span className={`text-sm font-semibold tabular-nums ${timeLeft <= 10 ? "text-red-500" : "text-gray-900"}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="flex items-center gap-3">
                <img src={activeListing.image_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">
                    R$ {fmtBRL(currentBidBRL)}
                  </div>
                  <div className="text-[10px] text-gray-500">{bidHistory.length} lances</div>
                </div>
              </div>
            </button>
          )}

          {bidHistory.length > 0 && !hasSold && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-3">Últimos lances</h4>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {bidHistory.slice(0, 5).map((bid) => (
                  <div key={bid.id} className="flex items-center gap-2">
                    <span className="text-base">{bid.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-900 truncate">{bid.bidder_name}</div>
                    </div>
                    <div className="text-xs font-semibold text-gray-900 tabular-nums">
                      R$ {fmtBRL(bid.amount_brl)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-gray-400 mt-auto">
            © 2026 — Foot Priv
          </p>
        </aside>
      </div>

      {/* === BOTTOM TAB MOBILE === */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 px-2 py-2 grid grid-cols-4 gap-1">
        <BottomTab active={tab === "feed"} onClick={() => goToTab("feed")} icon="home" label={dash.label_feed} />
        <BottomTab active={tab === "my-auction"} onClick={() => goToTab("my-auction")} icon="hammer" label={dash.label_auction} />
        <BottomTab active={tab === "wallet"} onClick={() => goToTab("wallet")} icon="wallet" label={dash.label_wallet} />
        <BottomTab active={tab === "profile"} onClick={() => goToTab("profile")} icon="user" label={dash.label_profile} />
      </nav>

      {/* === MODAL: ESCOLHER COMPRADOR === */}
      {showFinalModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 my-8 shadow-2xl relative">
            {/* Botão fechar */}
            <button
              onClick={() => setShowFinalModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition"
              title="Fechar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="font-display text-3xl text-gray-900 mb-2">Leilão finalizado!</h2>
              <p className="text-sm text-gray-600">
                {bidHistory.length > 0
                  ? "Escolha um comprador para finalizar a venda."
                  : "Nenhum lance foi recebido nesse leilão."}
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 mt-3 px-3 py-2 rounded-lg border border-amber-200">
                ⚠ Você não pode vender a mesma foto novamente.
              </p>
            </div>
            {bidHistory.length > 0 ? (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {bidHistory.slice(0, 8).map((bid, i) => (
                  <button key={bid.id} onClick={() => selectWinningBid(bid)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition text-left ${
                      i === 0
                        ? "border-emerald-300 bg-emerald-50 hover:bg-emerald-100"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}>
                    <span className="text-2xl flex-shrink-0">{bid.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 font-semibold truncate">{bid.bidder_name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500">
                        {bid.emirate} {i === 0 && <span className="text-emerald-600">· Maior</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold text-gray-900 tabular-nums">
                        R$ {fmtBRL(bid.amount_brl)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => setShowFinalModal(false)}
                className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition"
              >
                Fechar
              </button>
            )}
          </div>
        </div>
      )}

      {/* === MODAL CONFIRMAÇÃO DA FOTO INICIAL === */}
      {showConfirmPhotoModal && activeListing && (
        <div className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 my-8 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 mx-auto mb-3 bg-emerald-50 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="font-display text-2xl text-gray-900 mb-2">Confirme sua foto</h2>
              <p className="text-sm text-gray-600">
                Essa é a foto que vai pro leilão.<br />
                <strong>Você não pode trocar depois</strong> — então confira se é a certa.
              </p>
            </div>

            {/* Preview da foto */}
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-900 mb-4 border border-gray-200 relative">
              {uploadingNew ? (
                // Estado: enviando nova foto — esconde foto antiga + loading
                <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <p className="text-sm text-white/80 font-medium">Carregando nova foto...</p>
                </div>
              ) : (
                <img
                  src={activeListing.image_url}
                  alt="sua foto"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Aviso */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <p className="text-[11px] text-amber-800 leading-relaxed">
                ⚠ <strong>Os compradores valorizam exclusividade.</strong> Cada foto é vendida apenas uma vez.
                Se mandou qualquer coisa só pra ver como funciona, troque agora — depois de confirmar, a foto vai pra leilão e os lances começam a chegar.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  // NÃO fecha o modal — só abre o file picker pra trocar
                  // O modal continua aberto até ela clicar em "Confirmar e leiloar"
                  fileInputRef.current?.click();
                }}
                disabled={uploadingNew}
                className="bg-white border-2 border-gray-200 hover:border-gray-900 text-gray-900 font-bold py-3 rounded-xl transition text-sm disabled:opacity-50"
              >
                {uploadingNew ? "Enviando..." : "Trocar foto"}
              </button>
              <button
                onClick={() => setShowConfirmPhotoModal(false)}
                disabled={uploadingNew}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition text-sm shadow-md disabled:opacity-50"
              >
                Confirmar e leiloar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === TOAST DE AVISO DE LOCKDOWN (fixo no topo da tela, visível em qualquer dispositivo) === */}
      {showLockdownWarning && (
        <div className="fixed top-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:max-w-md z-[200] animate-fade-in pointer-events-none">
          <div className="bg-red-600 text-white px-4 py-3.5 rounded-2xl shadow-2xl flex items-start gap-2.5 border-2 border-red-700">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium leading-snug">
              Você precisa selecionar um plano para continuar usando a plataforma.
            </p>
          </div>
        </div>
      )}

      {/* === MODAL DE SAQUE === */}
      {showWithdrawModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
          onClick={(e) => {
            // Hard lockdown: clique no backdrop totalmente ignorado
            if (isHardLockdown) return;
            // Soft lockdown: clique no backdrop dispara aviso
            if (isSoftLockdown && e.target === e.currentTarget) {
              setShowLockdownWarning(true);
              setTimeout(() => setShowLockdownWarning(false), 4500);
              return;
            }
            // Sem lockdown: fecha clicando fora (se step permite)
            if (e.target === e.currentTarget && withdrawStep !== "processing" && withdrawStep !== "success") {
              closeWithdrawModal();
            }
          }}
        >
          <div className="bg-white rounded-3xl max-w-lg w-full my-3 sm:my-8 shadow-2xl relative max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header sticky */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-3 border-b border-gray-100 bg-white rounded-t-3xl flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                {/* Botão voltar:
                    - Sempre disponível em "details" / "confirm" / "plan" / "pix" se não tiver lockdown
                    - Em lockdown (hard ou soft): só permite voltar SE estiver no PIX (ela pode trocar plano) */}
                {(withdrawStep === "details" || withdrawStep === "confirm" || withdrawStep === "plan") && !isHardLockdown && !isSoftLockdown && (
                  <button onClick={backWithdrawStep} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {/* No PIX: voltar pra trocar de plano (sempre disponível, mesmo em lockdown) */}
                {withdrawStep === "pix" && (
                  <button onClick={backWithdrawStep} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition flex-shrink-0" title="Voltar e trocar plano">
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                <h2 className="font-display text-xl text-gray-900">
                  {withdrawStep === "method" && "Escolha como sacar"}
                  {withdrawStep === "details" && "Dados do beneficiário"}
                  {withdrawStep === "confirm" && "Confirmar saque"}
                  {withdrawStep === "plan" && "Antes de sacar..."}
                  {withdrawStep === "pix" && "Pague via PIX"}
                  {withdrawStep === "processing" && "Processando..."}
                  {withdrawStep === "success" && "Saque solicitado!"}
                </h2>
              </div>
              {/* X de fechar:
                  - some em hard lockdown (cupom)
                  - aparece em soft lockdown (3 min) e mostra aviso ao clicar
                  - aparece normal sem lockdown */}
              {withdrawStep !== "processing" && withdrawStep !== "success" && !isHardLockdown && (
                <button onClick={closeWithdrawModal} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              {isHardLockdown && (
                <div className="px-2.5 py-1 rounded-full bg-red-100 border border-red-300 flex items-center gap-1.5">
                  <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-red-700">Bloqueado</span>
                </div>
              )}
            </div>

            {/* Body com scroll */}
            <div className="overflow-y-auto p-5 sm:p-6 flex-1">

            {/* PASSO 1: Método */}
            {withdrawStep === "method" && (
              <>
                <p className="text-sm text-gray-600 mb-4">Saldo disponível: <strong>R$ {fmtBRL(withdrawAmount)}</strong></p>

                <button onClick={() => { setWithdrawMethod("pix"); nextWithdrawStep(); }}
                  className="w-full bg-white border-2 border-gray-200 hover:border-emerald-500 rounded-2xl p-4 mb-3 text-left transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#32BCAD] rounded-xl flex items-center justify-center group-hover:bg-[#2BA89A] transition">
                      <span className="text-white font-bold text-base tracking-wider">PIX</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">PIX</div>
                      <div className="text-xs text-gray-500">Tempo estimado: instantâneo</div>
                    </div>
                    <span className="text-xs bg-emerald-50 text-emerald-700 font-bold rounded-full px-2 py-1">Instantâneo</span>
                  </div>
                </button>

                <button onClick={() => { setWithdrawMethod("ted"); nextWithdrawStep(); }}
                  className="w-full bg-white border-2 border-gray-200 hover:border-gray-700 rounded-2xl p-4 text-left transition group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">Transferência bancária</div>
                      <div className="text-xs text-gray-500">Cai no próximo dia útil</div>
                    </div>
                    <span className="text-xs bg-gray-100 text-gray-700 font-semibold rounded-full px-2 py-1">D+1</span>
                  </div>
                </button>
              </>
            )}

            {/* PASSO 2: Detalhes */}
            {withdrawStep === "details" && (
              <>
                <p className="text-xs text-gray-500 mb-4">
                  Os dados do beneficiário precisam coincidir com o titular da conta cadastrada.
                </p>

                {/* Tipo de documento */}
                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Tipo de documento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setWithdrawDocType("cpf")}
                      className={`py-2.5 rounded-xl text-sm font-bold transition border ${
                        withdrawDocType === "cpf"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}>CPF</button>
                    <button type="button" onClick={() => setWithdrawDocType("cnpj")}
                      className={`py-2.5 rounded-xl text-sm font-bold transition border ${
                        withdrawDocType === "cnpj"
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}>CNPJ</button>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                    {withdrawDocType === "cpf" ? "CPF do beneficiário" : "CNPJ"}
                  </label>
                  <input type="text" value={withdrawDoc}
                    onChange={(e) => setWithdrawDoc(e.target.value.replace(/\D/g, "").slice(0, withdrawDocType === "cpf" ? 11 : 14))}
                    placeholder={withdrawDocType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition" />
                </div>

                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">
                    {withdrawDocType === "cpf" ? "Nome completo" : "Razão social"}
                  </label>
                  <input type="text" value={withdrawHolderName}
                    onChange={(e) => setWithdrawHolderName(e.target.value)}
                    placeholder={withdrawDocType === "cpf" ? "Como está no documento" : "Razão social da empresa"}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition" />
                </div>

                {/* PIX */}
                {withdrawMethod === "pix" && (
                  <>
                    <div className="mb-3">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Tipo de chave PIX</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {([
                          { id: "cpf", label: "CPF" },
                          { id: "phone", label: "Celular" },
                          { id: "email", label: "Email" },
                          { id: "random", label: "Aleatória" },
                        ] as const).map((k) => (
                          <button key={k.id} type="button" onClick={() => {
                            setWithdrawPixKeyType(k.id);
                            // Se escolher CPF, preenche automaticamente com o CPF do beneficiário
                            if (k.id === "cpf") {
                              setWithdrawPixKey(withdrawDoc || "");
                            } else {
                              // Outros tipos: limpa pra ela preencher
                              setWithdrawPixKey("");
                            }
                          }}
                            className={`py-2 rounded-lg text-[11px] font-bold transition border ${
                              withdrawPixKeyType === k.id
                                ? "bg-gray-900 text-white border-gray-900"
                                : "bg-white text-gray-700 border-gray-200"
                            }`}>{k.label}</button>
                        ))}
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Chave PIX</label>
                      <input type="text"
                        value={withdrawPixKeyType === "cpf" ? (withdrawDoc || "") : withdrawPixKey}
                        onChange={(e) => {
                          // Não permite editar quando é CPF — sempre usa o doc do titular
                          if (withdrawPixKeyType === "cpf") return;
                          setWithdrawPixKey(e.target.value);
                        }}
                        readOnly={withdrawPixKeyType === "cpf"}
                        placeholder={
                          withdrawPixKeyType === "phone" ? "+55 (00) 00000-0000" :
                          withdrawPixKeyType === "email" ? "seu@email.com" :
                          withdrawPixKeyType === "random" ? "abc12345-..." :
                          ""
                        }
                        className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition ${
                          withdrawPixKeyType === "cpf"
                            ? "bg-emerald-50/40 border-emerald-200 cursor-not-allowed font-mono tabular-nums"
                            : "bg-gray-50 border-gray-200 focus:border-gray-900"
                        }`} />
                      <p className="text-[10px] text-gray-500 mt-1">
                        {withdrawPixKeyType === "cpf"
                          ? "✓ Chave PIX preenchida automaticamente com o CPF do titular."
                          : "ⓘ A chave precisa estar vinculada ao mesmo CPF/CNPJ do titular."}
                      </p>
                    </div>
                  </>
                )}

                {/* TED */}
                {withdrawMethod === "ted" && (
                  <>
                    <div className="mb-3">
                      <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Banco (código)</label>
                      <input type="text" value={withdrawBankCode}
                        onChange={(e) => setWithdrawBankCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="Ex: 341 (Itaú), 237 (Bradesco)"
                        className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Agência</label>
                        <input type="text" value={withdrawAgency}
                          onChange={(e) => setWithdrawAgency(e.target.value.replace(/\D/g, ""))}
                          placeholder="0000"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-3 py-3 text-sm text-gray-900 outline-none transition" />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">Conta + dígito</label>
                        <input type="text" value={withdrawAccount}
                          onChange={(e) => setWithdrawAccount(e.target.value)}
                          placeholder="00000-0"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-3 py-3 text-sm text-gray-900 outline-none transition" />
                      </div>
                    </div>
                  </>
                )}

                {/* Aviso CNPJ */}
                {withdrawDocType === "cpf" && withdrawAmount >= 3800 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                    <div className="flex items-start gap-2">
                      <span className="text-base">💡</span>
                      <div>
                        <p className="text-xs font-bold text-amber-900 mb-1">Recomendação fiscal</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Creators que recebem mais de <strong>R$ 3.800/mês</strong> são incentivadas a abrir um <strong>CNPJ MEI</strong> pra pagar menos imposto e poder emitir nota fiscal. A taxa é de R$ 75,90/mês e isenta IR sobre a maioria das atividades.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {withdrawError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-3">
                    {withdrawError}
                  </div>
                )}

                <button onClick={nextWithdrawStep}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition text-sm">
                  Continuar
                </button>
              </>
            )}

            {/* PASSO 3: Confirmação - RECIBO */}
            {withdrawStep === "confirm" && (
              <>
                {/* Header recibo */}
                <div className="bg-gradient-to-br from-gray-900 to-black rounded-t-2xl p-4 -mx-1 mb-0">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1">Solicitação de saque</p>
                      <p className="text-white font-mono text-lg tabular-nums">#{withdrawNumber}</p>
                    </div>
                    <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-full px-2.5 py-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                        {withdrawMethod === "pix" ? "PIX" : "TED"}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/50 mb-1">Valor</p>
                  <div className="flex items-baseline gap-1 text-white">
                    <span className="text-sm">R$</span>
                    <span className="font-display text-3xl tabular-nums">{fmtBRL(withdrawAmount)}</span>
                  </div>
                </div>

                {/* Recibo */}
                <div className="bg-white border border-gray-200 border-t-0 rounded-b-2xl p-4 -mx-1 mb-4">
                  {/* Pagador */}
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-1.5">Pagador (origem)</p>
                    <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                      <p className="text-xs font-bold text-gray-900">FOOT PRIV TECNOLOGIA LTDA</p>
                      <p className="text-[11px] text-gray-600 font-mono mt-0.5">CNPJ 89.255.980/0001-12</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Banco 274 — Pagamento via gateway</p>
                    </div>
                  </div>

                  {/* Beneficiário */}
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-1.5">Beneficiário (destino)</p>
                    <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
                      <p className="text-xs font-bold text-gray-900">{withdrawHolderName || "—"}</p>
                      <p className="text-[11px] text-gray-700 font-mono mt-0.5">
                        {withdrawDocType === "cpf" ? "CPF" : "CNPJ"} {withdrawDoc || "—"}
                      </p>
                      {withdrawMethod === "pix" ? (
                        <>
                          <p className="text-[10px] text-gray-600 mt-1.5 uppercase tracking-wider font-semibold">
                            Chave {withdrawPixKeyType === "cpf" ? "CPF" : withdrawPixKeyType === "phone" ? "Celular" : withdrawPixKeyType === "email" ? "Email" : "Aleatória"}
                          </p>
                          <p className="text-[11px] text-gray-700 font-mono break-all">{withdrawPixKey || "—"}</p>
                        </>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 mt-1.5">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Banco</p>
                            <p className="text-[11px] text-gray-700 font-mono">{withdrawBankCode || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Agência</p>
                            <p className="text-[11px] text-gray-700 font-mono">{withdrawAgency || "—"}</p>
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Conta</p>
                            <p className="text-[11px] text-gray-700 font-mono">{withdrawAccount || "—"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="border-t border-dashed border-gray-200 pt-3 space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Data da solicitação</span>
                      <span className="text-gray-900 font-medium">{new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Hora</span>
                      <span className="text-gray-900 font-medium">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-gray-500">Tempo estimado</span>
                      <span className="text-gray-900 font-medium">
                        {withdrawMethod === "pix" ? "Até 2 minutos" : "Próximo dia útil"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-center text-gray-500 mb-3">
                  Este é apenas um pré-recibo. A solicitação só é confirmada após o próximo passo.
                </p>

                <button onClick={nextWithdrawStep}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition text-sm">
                  Confirmar saque
                </button>
              </>
            )}

            {/* PASSO 4: Paywall plano — Premium Dark */}
            {withdrawStep === "plan" && (
              <>
                {/* Header preto premium */}
                <div className="-mx-5 sm:-mx-6 -mt-5 sm:-mt-6 mb-5 px-5 sm:px-6 py-5 bg-gradient-to-br from-gray-900 to-black text-white">
                  <h3 className="font-display text-xl sm:text-2xl mb-1.5">Escolha seu plano</h3>
                  <p className="text-xs sm:text-[13px] text-white/70 leading-relaxed">
                    Pra liberar saques, ative um plano <strong className="text-[#62C86E]">anual</strong>. Pague <strong>uma vez por ano</strong> e use a plataforma sem se preocupar.
                  </p>
                </div>

                {/* Aviso URGENTE em lockdown (hard ou soft) */}
                {(isHardLockdown || isSoftLockdown) && (
                  <div className="mb-4 px-4 py-3 rounded-2xl bg-red-50 border-2 border-red-300 flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-red-800 leading-snug">
                        Você precisa selecionar um plano para continuar usando a plataforma.
                      </p>
                    </div>
                  </div>
                )}

                {/* Banner CUPOM ATIVO */}
                {activeCoupon && (() => {
                  const expiresIn = new Date(activeCoupon.expires_at).getTime() - Date.now();
                  const hours = Math.floor(expiresIn / (1000 * 60 * 60));
                  const minutes = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));
                  return (
                    <div className="mb-5 -mx-1 p-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white shadow-xl">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl flex-shrink-0">🎁</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm mb-0.5 leading-tight">{activeCoupon.discount_pct}% OFF EXCLUSIVO</p>
                          <p className="text-[11px] text-white/90 leading-snug">
                            Detectamos que você é uma <strong>creator de alto potencial</strong>. Cupom aplicado em todos os planos!
                          </p>
                          <p className="text-[10px] text-white/75 mt-1.5 font-mono">
                            ⏰ Expira em {hours > 0 ? `${hours}h ` : ""}{minutes}min
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Cards empilhados */}
                <div className="space-y-3 mb-5">
                  {[
                    {
                      id: "starter" as const,
                      name: "Creator",
                      yearly: 79,
                      fee: 10,
                      emoji: "🪙",
                      tagline: "Receba até R$ 12.000 / mês",
                      features: ["Saque PIX instantâneo 24h", "Leilões ilimitados"],
                    },
                    {
                      id: "creator" as const,
                      name: "Creator Advanced",
                      yearly: 99,
                      fee: 8,
                      emoji: "⭐",
                      tagline: "Receba até R$ 48.000 / mês",
                      features: ["Saque PIX instantâneo 24h", "Leilões ilimitados", "Suporte prioritário"],
                      recommended: true,
                    },
                    {
                      id: "super" as const,
                      name: "Top Creator",
                      yearly: 109,
                      fee: 4,
                      emoji: "👑",
                      tagline: "Saques acima de R$ 48.000 / mês",
                      features: ["Saque PIX instantâneo 24h", "Limite de saque ilimitado", "Selo verificado", "Posicionamento prioritário"],
                    },
                  ].map((p) => {
                    const selected = selectedPlanId === p.id;
                    const discountedPrice = activeCoupon
                      ? +(p.yearly * (1 - activeCoupon.discount_pct / 100)).toFixed(2)
                      : p.yearly;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`relative w-full text-left rounded-2xl p-4 transition-all border-2 ${
                          selected
                            ? "border-[#62C86E] bg-gradient-to-b from-[#62C86E]/8 to-[#62C86E]/2 shadow-[0_0_0_4px_rgba(98,200,110,0.12)]"
                            : "border-gray-200 bg-white hover:border-gray-400"
                        }`}
                      >
                        {/* Badge "⭐ RECOMENDADO" — fixo no canto superior direito do Creator */}
                        {p.recommended && (
                          <div className="absolute -top-2.5 right-3 bg-[#62C86E] text-white text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-[0.12em] shadow-md whitespace-nowrap flex items-center gap-1">
                            <span>⭐</span>
                            <span>Recomendado</span>
                          </div>
                        )}

                        {/* Indicador de seleção (radio) no canto superior esquerdo */}
                        <div className="absolute top-3 left-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selected
                              ? "border-[#62C86E] bg-[#62C86E]"
                              : "border-gray-300 bg-white"
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pl-7">
                          {/* Avatar circular */}
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                            selected ? "bg-[#62C86E]/15" : "bg-gray-50"
                          }`}>
                            {p.emoji}
                          </div>

                          {/* Nome + tagline */}
                          <div className="flex-1 min-w-0">
                            <div className="font-display text-lg text-gray-900 leading-tight">{p.name}</div>
                            <div className="text-[11px] text-gray-600 mt-0.5">{p.tagline}</div>
                          </div>

                          {/* Preço à direita (com desconto se tiver cupom) */}
                          <div className="text-right flex-shrink-0">
                            {activeCoupon ? (
                              <>
                                <div className="text-[10px] text-gray-400 line-through tabular-nums">
                                  R$ {p.yearly}
                                </div>
                                <div className="flex items-baseline justify-end gap-0.5">
                                  <span className="text-[10px] text-pink-600 font-bold">R$</span>
                                  <span className="font-display text-2xl text-pink-600 tabular-nums leading-none font-bold">
                                    {discountedPrice.toFixed(2).replace(".", ",")}
                                  </span>
                                </div>
                                <div className="text-[9px] text-pink-600 font-bold mt-0.5">
                                  -{activeCoupon.discount_pct}% OFF
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-baseline justify-end gap-0.5">
                                  <span className="text-[10px] text-gray-500">R$</span>
                                  <span className="font-display text-2xl text-gray-900 tabular-nums leading-none">{p.yearly}</span>
                                  <span className="text-[10px] text-gray-500">/ano</span>
                                </div>
                                <div className={`text-[10px] font-bold tabular-nums mt-1 ${
                                  p.fee <= 4 ? "text-[#62C86E]" : "text-gray-700"
                                }`}>
                                  + {p.fee}% taxa
                                </div>
                              </>
                            )}
                          </div>

                          {/* Check selected */}
                          {selected && !p.highlight && (
                            <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center shadow-md">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Features */}
                        <ul className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                          {p.features.map((f, fi) => (
                            <li key={fi} className="flex items-center gap-2 text-[11px] text-gray-700">
                              <svg className={`w-3 h-3 flex-shrink-0 ${
                                p.highlight ? "text-[#62C86E]" : "text-gray-500"
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </button>
                    );
                  })}
                </div>

                {withdrawError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-3">
                    {withdrawError}
                  </div>
                )}

                <button
                  onClick={nextWithdrawStep}
                  disabled={creatingPix}
                  className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-400 disabled:cursor-wait text-white font-bold py-3.5 rounded-2xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  {creatingPix ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                      Gerando PIX...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Gerar PIX e finalizar
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-gray-500 mt-2.5">
                  Pagamento anual via PIX · Renova a cada 12 meses
                </p>
              </>
            )}

            {/* PASSO 4.5: PIX QR Code */}
            {withdrawStep === "pix" && (
              <>
                {isDemoMode && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      ⚠ <strong>Modo demonstração.</strong> Este QR Code é apenas ilustrativo.
                      {demoReason && (
                        <>
                          <br /><strong>Motivo:</strong> {demoReason}
                        </>
                      )}
                    </p>
                  </div>
                )}

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold mb-1">Pague para ativar seu plano</p>
                  <p className="text-2xl font-display text-gray-900">R$ {(PLANS_DATA[selectedPlanId]?.yearly || 79).toFixed(2).replace(".", ",")}</p>
                  <p className="text-[10px] text-gray-600 mt-1">Plano {PLANS_DATA[selectedPlanId]?.name} · 1 ano</p>
                </div>

                {/* QR Code */}
                {pixQrCode && (
                  <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 mb-3 flex justify-center">
                    <img src={pixQrCode} alt="QR Code PIX" className="w-56 h-56" />
                  </div>
                )}

                {/* Chave copia-e-cola */}
                <div className="mb-4">
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5">PIX Copia e Cola</label>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                    <p className="text-[10px] text-gray-700 font-mono break-all leading-relaxed">{pixKey}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pixKey);
                        setPixCopied(true);
                        setTimeout(() => setPixCopied(false), 2000);
                      }}
                      className={`w-full mt-2 py-2 rounded-lg text-xs font-bold transition ${
                        pixCopied ? "bg-emerald-500 text-white" : "bg-gray-900 text-white hover:bg-black"
                      }`}
                    >
                      {pixCopied ? "✓ Copiado!" : "Copiar código"}
                    </button>
                  </div>
                </div>

                {/* Loader esperando pagamento */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-600 mb-4">
                  <div className="w-3 h-3 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin"></div>
                  <span>Aguardando pagamento...</span>
                </div>

                {/* Aviso destacado sobre o saque que será liberado */}
                {withdrawMethod === "pix" && withdrawPixKey && (
                  <div className="bg-gradient-to-br from-emerald-50 to-[#62C86E]/10 border-2 border-[#62C86E]/40 rounded-2xl p-4 mb-3">
                    <div className="flex items-start gap-2 mb-2">
                      <svg className="w-5 h-5 text-[#62C86E] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <p className="text-xs text-emerald-900 font-bold leading-snug">
                        Ao concluir o pagamento do plano, retorne nessa tela e confirme seu saque PIX:
                      </p>
                    </div>
                    <div className="bg-white border border-emerald-200 rounded-xl p-3 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Valor do saque</span>
                        <span className="text-sm font-display text-gray-900 tabular-nums font-bold">R$ {fmtBRL(withdrawAmount)}</span>
                      </div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold flex-shrink-0">Chave PIX</span>
                        <span className="text-[11px] font-mono text-gray-900 text-right break-all">{withdrawPixKey}</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-emerald-800 mt-2 leading-snug">
                      💚 <strong>O pagamento será instantâneo</strong> assim que você ativar o plano.
                    </p>
                  </div>
                )}

                {isDemoMode && (
                  <button onClick={nextWithdrawStep}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition text-sm">
                    Simular pagamento (demo)
                  </button>
                )}

                <p className="text-[10px] text-center text-gray-400 mt-3">
                  Assim que confirmarmos seu pagamento, seu saque será liberado automaticamente.
                </p>

                {/* Botão pra voltar e escolher outro plano (sempre disponível, mesmo em lockdown) */}
                <button
                  onClick={backWithdrawStep}
                  className="w-full mt-3 py-3 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition flex items-center justify-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Voltar e escolher outro plano</span>
                </button>
              </>
            )}

            {/* PASSO 5: Processamento */}
            {withdrawStep === "processing" && (
              <div className="py-10 text-center">
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h3 className="font-display text-xl text-gray-900 mb-2">Processando saque</h3>
                <p className="text-sm text-gray-600">Validando dados bancários...</p>
              </div>
            )}

            {/* PASSO 6: Sucesso */}
            {withdrawStep === "success" && (
              <div className="py-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl text-gray-900 mb-2">Saque solicitado!</h3>
                <p className="text-sm text-gray-600 mb-1">
                  R$ {fmtBRL(withdrawAmount)} via {withdrawMethod === "pix" ? "PIX" : "TED"}
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  {withdrawMethod === "pix"
                    ? "O dinheiro cai na sua conta em até 2 minutos."
                    : "O dinheiro cai na sua conta no próximo dia útil."}
                </p>
                <button onClick={closeWithdrawModal}
                  className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition text-sm">
                  Voltar pra carteira
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* === MODAL PROCESSAMENTO === */}
      {saleStep && selectedBid && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl">
            {saleStep === "verifying" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-semibold">Etapa 1 de 3</p>
                <h3 className="font-display text-2xl text-gray-900 mb-2">Verificando comprador</h3>
                <p className="text-sm text-gray-600">{selectedBid.bidder_name}</p>
              </>
            )}
            {saleStep === "debiting" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 relative">
                  <div className="absolute inset-0 border-4 border-amber-200 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-xs uppercase tracking-wider text-amber-600 mb-2 font-semibold">Etapa 2 de 3</p>
                <h3 className="font-display text-2xl text-gray-900 mb-2">Debitando saldo do comprador</h3>
                <p className="text-sm text-gray-600 mb-3 flex items-center justify-center gap-1.5">
                  <span className="text-base">{selectedBid.flag}</span>
                  {selectedBid.bidder_name}
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 inline-block">
                  <p className="text-[10px] uppercase tracking-wider text-amber-700 font-semibold mb-0.5">Valor debitado</p>
                  <p className="text-amber-900 font-display text-xl tabular-nums">
                    R$ {fmtBRL(selectedBid.amount_brl)}
                  </p>
                  <p className="text-[10px] text-amber-700 tabular-nums mt-0.5">
                    ≈ {fmtCurrency(brlToLocal(selectedBid.amount_brl, selectedBid.currencyRate), selectedBid.currency)}
                  </p>
                </div>
              </>
            )}
            {saleStep === "success" && (
              <>
                <div className="w-20 h-20 mx-auto mb-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs uppercase tracking-wider text-emerald-600 mb-2 font-semibold">Venda concluída</p>
                <h3 className="font-display text-2xl text-gray-900 mb-4">Resumo da venda</h3>

                {/* Resumo detalhado */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 my-5 text-left space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Pago pelo comprador</span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {fmtCurrency(brlToLocal(selectedBid.amount_brl, selectedBid.currencyRate), selectedBid.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200">
                    <span className="text-gray-500 text-xs">Equivalente em Reais</span>
                    <span className="text-gray-700 tabular-nums">R$ {fmtBRL(selectedBid.amount_brl)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Taxa FootPriv (10%)</span>
                    <span className="font-semibold text-red-500 tabular-nums">
                      − R$ {fmtBRL(selectedBid.amount_brl * PLATFORM_FEE)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-sm font-semibold text-gray-900">Você recebe (90%)</span>
                    <span className="font-display text-2xl text-emerald-600 tabular-nums font-light">
                      R$ {fmtBRL(selectedBid.amount_brl * (1 - PLATFORM_FEE))}
                    </span>
                  </div>
                </div>

                <button onClick={closeSaleAndGoToWallet}
                  className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition text-sm uppercase tracking-wider">
                  Ver carteira
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* === MODAL: DETALHES DE LEILÃO ANTERIOR === */}
      {openPastAuction && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full my-8 shadow-2xl overflow-hidden">
            <button onClick={() => setOpenPastAuction(null)}
              className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur w-9 h-9 rounded-full flex items-center justify-center hover:bg-white transition border border-gray-200">
              ×
            </button>

            <div className="relative aspect-square bg-gray-100">
              <img src={openPastAuction.image_url} alt="" className="w-full h-full object-cover" style={{ filter: `blur(${dash.feed_blur_intensity}px) ${dash.feed_grayscale ? "grayscale(100%)" : ""}` }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <div className="text-[10px] uppercase tracking-wider text-white/70 mb-1">Arrematado por</div>
                <div className="font-display text-4xl tabular-nums font-light">
                  R$ {fmtBRL(openPastAuction.final_amount_brl)}
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Comprador</h3>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center gap-3">
                <span className="text-3xl flex-shrink-0">{openPastAuction.buyer.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{openPastAuction.buyer.name}</div>
                  <div className="text-xs text-gray-600">{openPastAuction.buyer.emirate}, {openPastAuction.buyer.country}</div>
                  <div className="text-[10px] text-emerald-700 tabular-nums mt-1">
                    Pagou {fmtCurrency(brlToLocal(openPastAuction.final_amount_brl, openPastAuction.buyer.currencyRate), openPastAuction.buyer.currency)}
                  </div>
                </div>
              </div>

              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">
                Histórico de lances ({openPastAuction.bids.length})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {openPastAuction.bids.map((bid, i) => (
                  <div key={bid.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50">
                    <span className="text-base">{bid.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">{bid.bidder_name}</div>
                      <div className="text-[10px] text-gray-500">{bid.emirate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 tabular-nums">
                        R$ {fmtBRL(bid.amount_brl)}
                      </div>
                      <div className="text-[10px] text-gray-500 tabular-nums">
                        {fmtCurrency(brlToLocal(bid.amount_brl, bid.currencyRate), bid.currency)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL: ALTERAR SENHA === */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition">
              ×
            </button>
            <h3 className="font-display text-2xl text-gray-900 mb-1">Alterar senha</h3>
            <p className="text-sm text-gray-500 mb-5">Use uma senha forte com no mínimo 6 caracteres.</p>

            {passwordSuccess ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 mx-auto mb-3 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-gray-900">Senha alterada!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Nova senha</label>
                  <input type="password" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-1 block">Confirmar nova senha</label>
                  <input type="password" value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-gray-900 rounded-xl px-4 py-3 text-gray-900 focus:outline-none transition" />
                </div>
                {passwordError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
                    {passwordError}
                  </div>
                )}
                <button onClick={changePassword} disabled={passwordSaving}
                  className="w-full bg-gray-900 hover:bg-black disabled:bg-gray-300 text-white font-semibold py-3 rounded-xl transition text-sm mt-2">
                  {passwordSaving ? "Atualizando..." : "Atualizar senha"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// === COMPONENTES ===

function NavItem({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: string; label: string; badge?: string }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition ${
        active ? "bg-gray-100 text-gray-900 font-semibold" : "text-gray-700 hover:bg-gray-50"
      }`}>
      <Icon name={icon} active={active} />
      <span className="text-base flex-1 text-left">{label}</span>
      {badge && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );
}

function BottomTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition ${
        active ? "text-gray-900" : "text-gray-400"
      }`}>
      <Icon name={icon} active={active} />
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}

function Icon({ name, active }: { name: string; active: boolean }) {
  const fill = active ? "currentColor" : "none";
  if (name === "home") return <svg className="w-6 h-6" fill={fill} stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
  if (name === "hammer") return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  if (name === "wallet") return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6zM7 10V7a4 4 0 118 0v3" /></svg>;
  if (name === "user") return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
  return null;
}

function AppBanner() {
  return (
    <div className="relative bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 overflow-hidden shadow-md mx-0 lg:mx-0">
      <div className="absolute -right-6 -top-6 text-7xl opacity-20">📱</div>
      <div className="relative">
        <div className="inline-block bg-white/20 backdrop-blur text-white text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mb-2">
          Em breve
        </div>
        <h4 className="text-white font-bold text-base leading-tight mb-1">
          Vocês pediram e está quase lá!
        </h4>
        <p className="text-white/90 text-xs leading-relaxed mb-3">
          Nos próximos dias, a FootPriv estará disponível na <strong>App Store</strong> e <strong>Play Store</strong>.
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="bg-black/40 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-base"></span>
            <div className="text-white">
              <div className="text-[8px] leading-none uppercase opacity-80">Em breve na</div>
              <div className="text-[11px] leading-tight font-bold">App Store</div>
            </div>
          </div>
          <div className="bg-black/40 backdrop-blur rounded-lg px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-base">▶</span>
            <div className="text-white">
              <div className="text-[8px] leading-none uppercase opacity-80">Em breve no</div>
              <div className="text-[11px] leading-tight font-bold">Google Play</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ url, initial, size }: { url: string | null; initial: string; size: number }) {
  if (url) {
    return <img src={url} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  // Cor de fundo determinística baseada na inicial
  const colors = [
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-blue-400 to-indigo-500",
    "from-violet-400 to-purple-500",
  ];
  const colorIdx = initial.charCodeAt(0) % colors.length;
  return (
    <div
      className={`rounded-full bg-gradient-to-br ${colors[colorIdx]} text-white font-bold flex items-center justify-center flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">{label}</span>
      <span className={`text-sm text-gray-900 ${bold ? "font-bold tabular-nums" : "font-medium"} text-right break-all`}>{value}</span>
    </div>
  );
}
