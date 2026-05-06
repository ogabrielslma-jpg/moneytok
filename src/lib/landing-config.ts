// Config da landing — editável via /admin
// Campos visuais separados pra Desktop e Mobile

import { createClient } from "./supabase-client";

// Configurações que mudam entre desktop e mobile
export type ViewportConfig = {
  logo_size: number;          // 40-250
  logo_align: "left" | "center" | "right";
  background_position_x: number; // 0-100
  background_position_y: number; // 0-100
  background_size: number;       // 50-250
  background_overlay_opacity: number; // 0-100
  background_fit: "cover" | "contain" | "auto";
};

// Opção de uma pergunta
export type QuestionOption = {
  emoji: string;     // emoji (ou string vazia)
  text: string;      // texto da opção
  color: string;     // cor de destaque (ex: "#22c55e")
};

// Pergunta customizável
export type Question = {
  id: string;          // identificador interno (q1, q2…)
  title: string;       // pergunta principal
  subtitle: string;    // subtítulo/explicação
  options: QuestionOption[];
};

// Post fictício do feed do dashboard
export type FeedPost = {
  id: string;
  seller_name: string;
  seller_avatar_url: string;  // pode ser vazio (gera fallback)
  buyer_name: string;          // ex: "Khalid bin Faisal"
  buyer_emirate: string;       // ex: "Dubai · UAE"
  buyer_flag: string;          // emoji 🇦🇪
  amount_brl: number;          // valor da venda
  bids_count: number;          // quantidade de lances
  rarity: "common" | "rare" | "epic" | "legendary";
  time_ago: string;            // "há 12min" ou "agora"
  image_url: string;           // foto borrada/escondida
};

// Config do dashboard (tudo que o usuário logado vê)
export type DashboardConfig = {
  // Logo (pode ser igual ou diferente da landing)
  logo_mode: "text" | "image" | "same_as_landing";
  logo_primary: string;
  logo_secondary: string;
  logo_image_url: string;
  logo_size: number; // 40-200

  // Cores
  color_primary: string;
  color_accent: string;
  color_bg: string;        // fundo geral (default: #f9fafb)
  color_card_bg: string;   // fundo dos cards (default: #ffffff)

  // Textos da UI (sidebar/bottom-tab/labels)
  label_feed: string;
  label_auction: string;
  label_wallet: string;
  label_profile: string;
  label_my_auction: string;       // "Meu Leilão"
  label_active_auction: string;   // "Leilão ativo"
  label_closed_auctions: string;  // "Fechados"
  label_buyers_online: string;    // "Compradores online"
  label_top_creators: string;     // "Top creators"
  label_recent_sales: string;     // "Vendas recentes"

  // Blur das fotos vendidas
  feed_blur_intensity: number;  // 0-30 (px do blur)
  feed_grayscale: boolean;      // se aplica filtro preto e branco

  // Posts do feed (gerenciado manualmente no admin)
  feed_posts: FeedPost[];

  // Compradores fictícios que dão lance no leilão (gerenciado no admin)
  bidders: Bidder[];
};

// Comprador fictício
export type Bidder = {
  id: string;
  name: string;
  emirate: string;        // cidade
  country: string;        // país
  flag: string;           // emoji
  currency: string;       // ex: AED
  currency_rate: number;  // BRL → moeda local
  avatar_url: string;     // foto da pessoa
};

// Config completa
export type LandingConfig = {
  // Logo
  logo_mode: "text" | "image";
  logo_primary: string;
  logo_secondary: string;
  logo_image_url: string;

  // Textos
  tagline: string;
  headline: string;       // texto plano (fallback)
  headline_html: string;  // HTML rich (com bold/italic/underline/highlight)
  headline_size: number;       // 12-72 (px)
  headline_weight: number;     // 300-900
  headline_align: "left" | "center" | "right";

  cta_text: string;
  cta_size: number;        // 12-32
  cta_weight: number;      // 300-900

  // Perguntas (5 padrão, mas customizáveis)
  questions: Question[];

  // Banner topo (livre)
  banner_enabled: boolean;
  banner_mode: "text" | "image";
  banner_text: string;
  banner_image_url: string;
  banner_bg_color: string;
  banner_text_color: string;
  banner_link_url: string; // opcional, banner clicável

  // Cores gerais
  color_primary: string;
  color_accent: string;
  color_bg_from: string;
  color_bg_via: string;
  color_bg_to: string;

  // Imagem de fundo
  background_image_url: string;

  // Configs específicas por viewport
  desktop: ViewportConfig;
  mobile: ViewportConfig;

  faqs: { q: string; a: string }[];

  // Config do dashboard (pós-login)
  dashboard: DashboardConfig;
};

const DEFAULT_VIEWPORT: ViewportConfig = {
  logo_size: 100,
  logo_align: "center",
  background_position_x: 50,
  background_position_y: 50,
  background_size: 100,
  background_overlay_opacity: 40,
  background_fit: "cover",
};

const DEFAULT_FEED_POSTS: FeedPost[] = [
  {
    id: "post-1",
    seller_name: "isabella_22",
    seller_avatar_url: "",
    buyer_name: "Khalid bin Faisal",
    buyer_emirate: "Dubai · UAE",
    buyer_flag: "🇦🇪",
    amount_brl: 287.50,
    bids_count: 14,
    rarity: "rare",
    time_ago: "há 3min",
    image_url: "",
  },
  {
    id: "post-2",
    seller_name: "mariana.s",
    seller_avatar_url: "",
    buyer_name: "Mohammed Al Saud",
    buyer_emirate: "Riyadh · KSA",
    buyer_flag: "🇸🇦",
    amount_brl: 342.00,
    bids_count: 11,
    rarity: "epic",
    time_ago: "há 8min",
    image_url: "",
  },
  {
    id: "post-3",
    seller_name: "carolina_lf",
    seller_avatar_url: "",
    buyer_name: "Ahmed bin Hamad",
    buyer_emirate: "Doha · QAT",
    buyer_flag: "🇶🇦",
    amount_brl: 219.90,
    bids_count: 9,
    rarity: "common",
    time_ago: "há 12min",
    image_url: "",
  },
  {
    id: "post-4",
    seller_name: "julia.melo",
    seller_avatar_url: "",
    buyer_name: "Tariq Al Maktoum",
    buyer_emirate: "Abu Dhabi · UAE",
    buyer_flag: "🇦🇪",
    amount_brl: 399.70,
    bids_count: 17,
    rarity: "legendary",
    time_ago: "há 19min",
    image_url: "",
  },
  {
    id: "post-5",
    seller_name: "beatriz_a",
    seller_avatar_url: "",
    buyer_name: "Hamdan bin Rashid",
    buyer_emirate: "Kuwait City · KWT",
    buyer_flag: "🇰🇼",
    amount_brl: 256.40,
    bids_count: 12,
    rarity: "rare",
    time_ago: "há 27min",
    image_url: "",
  },
  {
    id: "post-6",
    seller_name: "rafaela.t",
    seller_avatar_url: "",
    buyer_name: "Saif bin Zayed",
    buyer_emirate: "Manama · BHR",
    buyer_flag: "🇧🇭",
    amount_brl: 312.10,
    bids_count: 13,
    rarity: "epic",
    time_ago: "há 34min",
    image_url: "",
  },
];

export const DEFAULT_BIDDERS: Bidder[] = [
  // Arábia Saudita 🇸🇦 (SAR)
  { id: "bidder-1", name: "Khalid bin Salman Al-Farsi", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-2", name: "Abdulaziz Al-Rashid", emirate: "Jeddah", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-3", name: "Faisal bin Mohammed", emirate: "Mecca", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-4", name: "Saud Al-Otaibi", emirate: "Medina", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  { id: "bidder-5", name: "Bandar Al-Qahtani", emirate: "Dammam", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75, avatar_url: "" },
  // Emirados Árabes 🇦🇪 (AED)
  { id: "bidder-6", name: "Mohammed Al-Maktoum", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-7", name: "Ahmed bin Zayed", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-8", name: "Hamdan Al-Nahyan", emirate: "Sharjah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-9", name: "Sultan Al-Qasimi", emirate: "Ajman", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-10", name: "Rashid bin Saeed", emirate: "Ras Al Khaimah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  { id: "bidder-11", name: "Tahnoun Al-Mansoori", emirate: "Fujairah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74, avatar_url: "" },
  // Catar 🇶🇦 (QAR)
  { id: "bidder-12", name: "Tamim bin Hamad Al-Thani", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-13", name: "Jassim Al-Kuwari", emirate: "Al Wakrah", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-14", name: "Abdullah Al-Attiyah", emirate: "Al Khor", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  { id: "bidder-15", name: "Hamad Al-Misnad", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73, avatar_url: "" },
  // Kuwait 🇰🇼 (KWD)
  { id: "bidder-16", name: "Sabah Al-Sabah", emirate: "Kuwait City", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-17", name: "Yousef Al-Mutawa", emirate: "Hawalli", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-18", name: "Nasser Al-Khaled", emirate: "Salmiya", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  { id: "bidder-19", name: "Fahad Al-Ghanim", emirate: "Farwaniya", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061, avatar_url: "" },
  // Bahrein 🇧🇭 (BHD)
  { id: "bidder-20", name: "Hamad Al-Khalifa", emirate: "Manama", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  { id: "bidder-21", name: "Salman Al-Zayani", emirate: "Riffa", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  { id: "bidder-22", name: "Khalifa Al-Dosari", emirate: "Muharraq", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075, avatar_url: "" },
  // Omã 🇴🇲 (OMR)
  { id: "bidder-23", name: "Qaboos Al-Said", emirate: "Muscat", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
  { id: "bidder-24", name: "Haitham Al-Busaidi", emirate: "Salalah", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
  { id: "bidder-25", name: "Asaad Al-Harthy", emirate: "Sohar", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077, avatar_url: "" },
];

// Pool de templates pra "+ Adicionar comprador" — gera dados aleatórios prontos
const BIDDER_TEMPLATES: Omit<Bidder, "id" | "avatar_url">[] = [
  { name: "Sheikh Al-Nuaimi", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Saif bin Rashid", emirate: "Sharjah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Hassan Al-Suwaidi", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currency_rate: 0.74 },
  { name: "Turki Al-Faisal", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Mansour Al-Saud", emirate: "Jeddah", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Walid Al-Ibrahim", emirate: "Dammam", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currency_rate: 0.75 },
  { name: "Khalifa Al-Thani", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73 },
  { name: "Mohammed Al-Sulaiti", emirate: "Al Rayyan", country: "Catar", flag: "🇶🇦", currency: "QAR", currency_rate: 0.73 },
  { name: "Jaber Al-Sabah", emirate: "Kuwait City", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061 },
  { name: "Ali Al-Salem", emirate: "Hawalli", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currency_rate: 0.061 },
  { name: "Isa Al-Khalifa", emirate: "Manama", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currency_rate: 0.075 },
  { name: "Tariq Al-Lawati", emirate: "Muscat", country: "Omã", flag: "🇴🇲", currency: "OMR", currency_rate: 0.077 },
];

export function generateRandomBidder(): Bidder {
  const t = BIDDER_TEMPLATES[Math.floor(Math.random() * BIDDER_TEMPLATES.length)];
  return {
    id: `bidder-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    name: t.name,
    emirate: t.emirate,
    country: t.country,
    flag: t.flag,
    currency: t.currency,
    currency_rate: t.currency_rate,
    avatar_url: "",
  };
}

const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  logo_mode: "same_as_landing",
  logo_primary: "FOOT",
  logo_secondary: "PRIV",
  logo_image_url: "",
  logo_size: 100,

  color_primary: "#22c55e",
  color_accent: "#a3e635",
  color_bg: "#f9fafb",
  color_card_bg: "#ffffff",

  label_feed: "Feed",
  label_auction: "Meu Leilão",
  label_wallet: "Carteira",
  label_profile: "Perfil",
  label_my_auction: "Meu Leilão",
  label_active_auction: "Leilão ativo",
  label_closed_auctions: "Fechados",
  label_buyers_online: "Compradores online",
  label_top_creators: "Top creators",
  label_recent_sales: "Vendas recentes",

  feed_blur_intensity: 12,
  feed_grayscale: false,

  feed_posts: DEFAULT_FEED_POSTS,
  bidders: DEFAULT_BIDDERS,
};

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  logo_mode: "text",
  logo_primary: "FOOT",
  logo_secondary: "PRIV",
  logo_image_url: "",

  tagline: "Discreto · Anônimo · Lucrativo",
  headline: "Mais de 43.730 compradores ativos aguardando sua foto agora",
  headline_html: "Mais de <strong>43.730 compradores ativos</strong> aguardando sua foto agora",
  headline_size: 16,
  headline_weight: 300,
  headline_align: "center",

  cta_text: "Enviar aos compradores",
  cta_size: 14,
  cta_weight: 700,

  questions: [
    {
      id: "q1",
      title: "Você tem alguma tatuagem nos pés?",
      subtitle: "Compradores valorizam exclusividade visual.",
      options: [
        { emoji: "❌", text: "Não tenho", color: "#22c55e" },
        { emoji: "✨", text: "Tenho uma pequena", color: "#3b82f6" },
        { emoji: "🎨", text: "Tenho várias", color: "#a855f7" },
        { emoji: "🤫", text: "Tenho, mas escondidas", color: "#f59e0b" },
      ],
    },
    {
      id: "q2",
      title: "Costuma pintar as unhas dos pés?",
      subtitle: "Cores chamativas aumentam o lance médio.",
      options: [
        { emoji: "❌", text: "Nunca", color: "#22c55e" },
        { emoji: "💅", text: "Às vezes", color: "#3b82f6" },
        { emoji: "🌹", text: "Sempre", color: "#a855f7" },
        { emoji: "💎", text: "Faço pedicure profissional", color: "#f59e0b" },
      ],
    },
    {
      id: "q3",
      title: "Qual o formato dos seus dedos?",
      subtitle: "Cada formato tem demanda em diferentes regiões.",
      options: [
        { emoji: "🔻", text: "Egípcio (decrescente)", color: "#22c55e" },
        { emoji: "🏛", text: "Grego (segundo dedo maior)", color: "#3b82f6" },
        { emoji: "📏", text: "Romano (3 primeiros iguais)", color: "#a855f7" },
        { emoji: "🤷", text: "Não sei", color: "#6b7280" },
      ],
    },
    {
      id: "q4",
      title: "Qual o tamanho do seu pé?",
      subtitle: "Tamanhos pequenos são mais valorizados em Dubai.",
      options: [
        { emoji: "🌸", text: "33-35", color: "#22c55e" },
        { emoji: "🌷", text: "36-37", color: "#3b82f6" },
        { emoji: "🌻", text: "38-39", color: "#a855f7" },
        { emoji: "🌹", text: "40+", color: "#f59e0b" },
      ],
    },
    {
      id: "q5",
      title: "Cuidados com os pés?",
      subtitle: "Quanto mais cuidados, maior a raridade.",
      options: [
        { emoji: "🚿", text: "Nenhum especial", color: "#22c55e" },
        { emoji: "💧", text: "Hidratação semanal", color: "#3b82f6" },
        { emoji: "💅", text: "Pedicure mensal", color: "#a855f7" },
        { emoji: "✨", text: "Spa, esfoliação, hidratação diária", color: "#f59e0b" },
      ],
    },
  ],

  banner_enabled: false,
  banner_mode: "text",
  banner_text: "",
  banner_image_url: "",
  banner_bg_color: "#fbbf24",
  banner_text_color: "#0a0a0a",
  banner_link_url: "",

  color_primary: "#22c55e",
  color_accent: "#a3e635",
  color_bg_from: "#1a1a2e",
  color_bg_via: "#0a0a0a",
  color_bg_to: "#000000",

  background_image_url: "",

  desktop: { ...DEFAULT_VIEWPORT },
  mobile: { ...DEFAULT_VIEWPORT },

  faqs: [
    { q: "Como funciona?", a: "Você envia a foto do seu pé no formulário acima e recebe propostas de compra de algum dos nossos 43.730 usuários compradores." },
    { q: "Como eu vou receber o pagamento?", a: "Dentro da plataforma você cadastra uma conta bancária e uma chave pix. Os pagamentos caem na conta dentro de 15 minutos após a venda." },
    { q: "Regras da plataforma. Leia com atenção!", a: "Os compradores querem exclusividade. Você vai receber uma vez por uma foto vendida." },
  ],

  dashboard: DEFAULT_DASHBOARD_CONFIG,
};

// Migra config antiga (sem desktop/mobile) pra nova estrutura
function migrateConfig(raw: any): LandingConfig {
  const merged: any = { ...DEFAULT_LANDING_CONFIG, ...raw };

  // Se viertor de versão antiga, copia campos legados
  if (!raw?.desktop || typeof raw.desktop !== "object") {
    merged.desktop = {
      logo_size: raw?.logo_size ?? DEFAULT_VIEWPORT.logo_size,
      logo_align: raw?.logo_align ?? DEFAULT_VIEWPORT.logo_align,
      background_position_x: raw?.background_position_x ?? DEFAULT_VIEWPORT.background_position_x,
      background_position_y: raw?.background_position_y ?? DEFAULT_VIEWPORT.background_position_y,
      background_size: raw?.background_size ?? DEFAULT_VIEWPORT.background_size,
      background_overlay_opacity: raw?.background_overlay_opacity ?? DEFAULT_VIEWPORT.background_overlay_opacity,
      background_fit: raw?.background_fit ?? DEFAULT_VIEWPORT.background_fit,
    };
  }
  if (!raw?.mobile || typeof raw.mobile !== "object") {
    merged.mobile = { ...merged.desktop };
  }

  // Migra banner_top → banner se existir
  if (raw?.banner_top_text && !merged.banner_text) {
    merged.banner_enabled = !!raw.banner_top_enabled;
    merged.banner_mode = "text";
    merged.banner_text = raw.banner_top_text;
  }

  // Se headline_html não existir, usa headline plano
  if (!raw?.headline_html && raw?.headline) {
    merged.headline_html = raw.headline;
  }

  // Se questions não existir, usa as default
  if (!Array.isArray(raw?.questions) || raw.questions.length === 0) {
    merged.questions = DEFAULT_LANDING_CONFIG.questions;
  }

  // Se dashboard não existir, usa default
  if (!raw?.dashboard || typeof raw.dashboard !== "object") {
    merged.dashboard = DEFAULT_DASHBOARD_CONFIG;
  } else {
    // Merge: preserva o que já tem mas garante todos os campos
    merged.dashboard = { ...DEFAULT_DASHBOARD_CONFIG, ...raw.dashboard };
    // Se feed_posts não existir, usa default
    if (!Array.isArray(merged.dashboard.feed_posts) || merged.dashboard.feed_posts.length === 0) {
      merged.dashboard.feed_posts = DEFAULT_FEED_POSTS;
    }
    // Se bidders não existir, usa default (compat configs antigas)
    if (!Array.isArray(merged.dashboard.bidders) || merged.dashboard.bidders.length === 0) {
      merged.dashboard.bidders = DEFAULT_BIDDERS;
    }
  }

  return merged as LandingConfig;
}

export async function fetchLandingConfig(): Promise<LandingConfig> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("landing_config")
      .select("data")
      .eq("id", "main")
      .single();

    if (error || !data) return DEFAULT_LANDING_CONFIG;
    return migrateConfig(data.data);
  } catch {
    return DEFAULT_LANDING_CONFIG;
  }
}

export async function saveLandingConfig(config: LandingConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("landing_config")
      .upsert({ id: "main", data: config, updated_at: new Date().toISOString() });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro desconhecido" };
  }
}

// Upload de asset pra Supabase Storage
export async function uploadLandingAsset(file: File, folder: "logo" | "banner" | "background"): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("landing-assets")
      .upload(safeName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) return { ok: false, error: uploadError.message };

    const { data } = supabase.storage.from("landing-assets").getPublicUrl(safeName);
    return { ok: true, url: data.publicUrl };
  } catch (err: any) {
    return { ok: false, error: err.message || "Erro no upload" };
  }
}

// Sanitiza HTML pra renderizar com dangerouslySetInnerHTML
// Aceita apenas tags inline seguras: strong, em, u, mark, span (com style background/color), s, br
export function sanitizeRichHtml(html: string): string {
  if (!html) return "";
  // Remove scripts, iframes, eventos onXxx
  let safe = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
  safe = safe.replace(/\son\w+="[^"]*"/gi, "");
  safe = safe.replace(/\son\w+='[^']*'/gi, "");
  safe = safe.replace(/javascript:/gi, "");
  return safe;
}
