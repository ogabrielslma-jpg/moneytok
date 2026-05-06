// Dados fictícios — TUDO INVENTADO. Projeto acadêmico simulado.

export type Sheik = {
  name: string;
  emirate: string;
  country: string;
  flag: string;
  currency: string;
  currencyRate: number;
};

export const FAKE_SHEIKS: Sheik[] = [
  { name: "Abdullah Al-Footim", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currencyRate: 0.74 },
  { name: "Khalid bin Toetalla", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currencyRate: 0.75 },
  { name: "Mohammed Al-Pedalov", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currencyRate: 0.74 },
  { name: "Yusuf Al-Heelman", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currencyRate: 0.73 },
  { name: "Faisal Bin Soleyman", emirate: "Kuwait City", country: "Kuwait", flag: "🇰🇼", currency: "KWD", currencyRate: 0.061 },
  { name: "Omar Ankleworth III", emirate: "Sharjah", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currencyRate: 0.74 },
  { name: "Rashid Al-Archski", emirate: "Manama", country: "Bahrein", flag: "🇧🇭", currency: "BHD", currencyRate: 0.075 },
  { name: "Tariq bin Bunionov", emirate: "Muscat", country: "Omã", flag: "🇴🇲", currency: "OMR", currencyRate: 0.077 },
  { name: "Ibrahim Al-Tarsali", emirate: "Dubai", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currencyRate: 0.74 },
  { name: "Hamad Bin Calluso", emirate: "Riyadh", country: "Arábia Saudita", flag: "🇸🇦", currency: "SAR", currencyRate: 0.75 },
  { name: "Nasser Al-Insteppi", emirate: "Doha", country: "Catar", flag: "🇶🇦", currency: "QAR", currencyRate: 0.73 },
  { name: "Mansour Bin Pedicur", emirate: "Abu Dhabi", country: "Emirados Árabes", flag: "🇦🇪", currency: "AED", currencyRate: 0.74 },
];

export const RARITIES = [
  { label: "Common", color: "text-gray-600 border-gray-300", multiplier: 1 },
  { label: "Rare", color: "text-blue-600 border-blue-300", multiplier: 3 },
  { label: "Epic", color: "text-purple-600 border-purple-300", multiplier: 8 },
  { label: "Legendary", color: "text-amber-600 border-amber-300", multiplier: 25 },
  { label: "Pharaonic", color: "text-emerald-600 border-emerald-300", multiplier: 100 },
];

export const FOOT_ADJECTIVES = [
  "Pristine", "Sun-Kissed", "Marble-Smooth", "Royal", "Pearlescent",
  "Velvet-Soft", "Diamond-Heeled", "Honey-Glazed", "Saharan", "Moonlit",
  "Silken", "Pomegranate-Tinted", "Cashmere-Wrapped", "Topaz", "Goddess-Tier",
];

export const FOOT_NOUNS = [
  "Arches", "Soles", "Heels", "Toes Quintet", "Ankles", "Pedals",
  "Footprints", "Imprints", "Twin Petals", "Sacred Pair",
];

export function randomBidder(): Sheik & { avatar: string } {
  const sheik = FAKE_SHEIKS[Math.floor(Math.random() * FAKE_SHEIKS.length)];
  return {
    ...sheik,
    avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(sheik.name)}`,
  };
}

export function randomBidIncrementBRL(currentBidBRL: number): number {
  // Increment entre R$ 2 e R$ 12 — leilão dura mais lances
  const min = 2;
  const max = 12;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export function brlToLocal(brl: number, rate: number): number {
  return Math.round(brl * rate * 100) / 100;
}

export function generateListingTitle(): string {
  const adj = FOOT_ADJECTIVES[Math.floor(Math.random() * FOOT_ADJECTIVES.length)];
  const noun = FOOT_NOUNS[Math.floor(Math.random() * FOOT_NOUNS.length)];
  return `${adj} ${noun}`;
}

export const HERO_BG = "https://images.unsplash.com/photo-1557672172-298e090bd0f1?auto=format&fit=crop&w=2000&q=80";

export const PLACEHOLDER_IMAGES = [
  "https://picsum.photos/seed/foot1/800/800",
  "https://picsum.photos/seed/foot2/800/800",
  "https://picsum.photos/seed/foot3/800/800",
  "https://picsum.photos/seed/foot4/800/800",
  "https://picsum.photos/seed/foot5/800/800",
  "https://picsum.photos/seed/foot6/800/800",
  "https://picsum.photos/seed/foot7/800/800",
  "https://picsum.photos/seed/foot8/800/800",
];
