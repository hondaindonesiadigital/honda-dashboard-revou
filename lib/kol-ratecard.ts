// KOL ratecard: tiers, deliverables and the KOL roster shown on /ratecard.
// The roster below is SAMPLE data with fictional handles — replace it with
// the real negotiated rates before using the page for budgeting.

export type Platform = 'Instagram' | 'TikTok' | 'YouTube'

export type DeliverableKey =
  | 'ig_feed'
  | 'ig_reels'
  | 'ig_story'
  | 'tiktok_video'
  | 'yt_dedicated'
  | 'yt_integration'

export interface Deliverable {
  key: DeliverableKey
  label: string
  platform: Platform
  // Share of followers a single deliverable typically reaches; used only for
  // the estimator's reach / CPM projection.
  reachRate: number
}

export const DELIVERABLES: Deliverable[] = [
  { key: 'ig_feed', label: 'IG Feed', platform: 'Instagram', reachRate: 0.25 },
  { key: 'ig_reels', label: 'IG Reels', platform: 'Instagram', reachRate: 0.4 },
  { key: 'ig_story', label: 'IG Story (3 frame)', platform: 'Instagram', reachRate: 0.1 },
  { key: 'tiktok_video', label: 'TikTok Video', platform: 'TikTok', reachRate: 0.35 },
  { key: 'yt_dedicated', label: 'YouTube Dedicated', platform: 'YouTube', reachRate: 0.2 },
  { key: 'yt_integration', label: 'YouTube Integration', platform: 'YouTube', reachRate: 0.15 },
]

export const DELIVERABLE_BY_KEY = Object.fromEntries(
  DELIVERABLES.map(d => [d.key, d]),
) as Record<DeliverableKey, Deliverable>

export type TierName = 'Nano' | 'Micro' | 'Mid-tier' | 'Macro' | 'Mega'

export interface Tier {
  name: TierName
  minFollowers: number
  maxFollowers: number | null
  // Indicative market range (IDR) for one IG Reels, shown as a reference.
  reelsRange: [number, number]
  color: string
}

export const TIERS: Tier[] = [
  { name: 'Nano', minFollowers: 1_000, maxFollowers: 10_000, reelsRange: [300_000, 1_500_000], color: '#9CA3AF' },
  { name: 'Micro', minFollowers: 10_000, maxFollowers: 100_000, reelsRange: [1_500_000, 8_000_000], color: '#2563EB' },
  { name: 'Mid-tier', minFollowers: 100_000, maxFollowers: 500_000, reelsRange: [8_000_000, 25_000_000], color: '#059669' },
  { name: 'Macro', minFollowers: 500_000, maxFollowers: 1_000_000, reelsRange: [25_000_000, 60_000_000], color: '#D97706' },
  { name: 'Mega', minFollowers: 1_000_000, maxFollowers: null, reelsRange: [60_000_000, 250_000_000], color: '#E62533' },
]

export function tierFor(followers: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (followers >= TIERS[i].minFollowers) return TIERS[i]
  }
  return TIERS[0]
}

export interface PlatformStat {
  platform: Platform
  handle: string
  followers: number
  engagementRate: number // percent
}

export interface Kol {
  id: string
  name: string
  category: string
  city: string
  platforms: PlatformStat[]
  rates: Partial<Record<DeliverableKey, number>>
}

export function maxFollowers(kol: Kol): number {
  return Math.max(...kol.platforms.map(p => p.followers))
}

export function followersOn(kol: Kol, platform: Platform): number {
  return kol.platforms.find(p => p.platform === platform)?.followers ?? 0
}

export function profileUrl(p: PlatformStat): string {
  const h = p.handle.replace(/^@/, '')
  if (p.platform === 'Instagram') return `https://www.instagram.com/${h}/`
  if (p.platform === 'TikTok') return `https://www.tiktok.com/@${h}`
  return `https://www.youtube.com/@${h}`
}

export const KOLS: Kol[] = [
  {
    id: 'k01', name: 'Raka Pratama', category: 'Otomotif', city: 'Jakarta',
    platforms: [
      { platform: 'Instagram', handle: 'rakamotoride', followers: 1_250_000, engagementRate: 2.1 },
      { platform: 'YouTube', handle: 'rakamotoride', followers: 860_000, engagementRate: 3.4 },
      { platform: 'TikTok', handle: 'rakamotoride', followers: 940_000, engagementRate: 5.2 },
    ],
    rates: { ig_feed: 45_000_000, ig_reels: 65_000_000, ig_story: 18_000_000, tiktok_video: 50_000_000, yt_dedicated: 120_000_000, yt_integration: 70_000_000 },
  },
  {
    id: 'k02', name: 'Dinda Lestari', category: 'Lifestyle', city: 'Jakarta',
    platforms: [
      { platform: 'Instagram', handle: 'dindalestari.id', followers: 720_000, engagementRate: 3.0 },
      { platform: 'TikTok', handle: 'dindalestari', followers: 1_100_000, engagementRate: 6.1 },
    ],
    rates: { ig_feed: 28_000_000, ig_reels: 38_000_000, ig_story: 10_000_000, tiktok_video: 42_000_000 },
  },
  {
    id: 'k03', name: 'Bagas Wicaksono', category: 'Otomotif', city: 'Bandung',
    platforms: [
      { platform: 'YouTube', handle: 'bagasgarage', followers: 410_000, engagementRate: 4.2 },
      { platform: 'Instagram', handle: 'bagasgarage', followers: 185_000, engagementRate: 3.8 },
    ],
    rates: { ig_feed: 9_000_000, ig_reels: 14_000_000, ig_story: 4_000_000, yt_dedicated: 35_000_000, yt_integration: 20_000_000 },
  },
  {
    id: 'k04', name: 'Salsa Ramadhani', category: 'Family', city: 'Tangerang',
    platforms: [
      { platform: 'Instagram', handle: 'salsamomlife', followers: 265_000, engagementRate: 4.5 },
      { platform: 'TikTok', handle: 'salsamomlife', followers: 190_000, engagementRate: 7.0 },
    ],
    rates: { ig_feed: 10_000_000, ig_reels: 15_000_000, ig_story: 4_500_000, tiktok_video: 12_000_000 },
  },
  {
    id: 'k05', name: 'Fajar Nugroho', category: 'Travel', city: 'Yogyakarta',
    platforms: [
      { platform: 'Instagram', handle: 'fajarjalanjalan', followers: 88_000, engagementRate: 5.6 },
      { platform: 'YouTube', handle: 'fajarjalanjalan', followers: 64_000, engagementRate: 6.0 },
    ],
    rates: { ig_feed: 3_500_000, ig_reels: 5_500_000, ig_story: 1_500_000, yt_dedicated: 9_000_000, yt_integration: 5_000_000 },
  },
  {
    id: 'k06', name: 'Nadia Putri', category: 'Tech', city: 'Jakarta',
    platforms: [
      { platform: 'YouTube', handle: 'nadiatekno', followers: 1_450_000, engagementRate: 3.1 },
      { platform: 'TikTok', handle: 'nadiatekno', followers: 620_000, engagementRate: 4.8 },
      { platform: 'Instagram', handle: 'nadiatekno', followers: 380_000, engagementRate: 2.9 },
    ],
    rates: { ig_feed: 14_000_000, ig_reels: 20_000_000, ig_story: 6_000_000, tiktok_video: 30_000_000, yt_dedicated: 150_000_000, yt_integration: 85_000_000 },
  },
  {
    id: 'k07', name: 'Yoga Saputra', category: 'Komedi', city: 'Surabaya',
    platforms: [
      { platform: 'TikTok', handle: 'yogangakak', followers: 2_300_000, engagementRate: 8.4 },
      { platform: 'Instagram', handle: 'yogangakak', followers: 540_000, engagementRate: 4.1 },
    ],
    rates: { ig_feed: 22_000_000, ig_reels: 30_000_000, ig_story: 8_000_000, tiktok_video: 75_000_000 },
  },
  {
    id: 'k08', name: 'Intan Maharani', category: 'Lifestyle', city: 'Bekasi',
    platforms: [
      { platform: 'Instagram', handle: 'intanmaharanii', followers: 42_000, engagementRate: 6.3 },
      { platform: 'TikTok', handle: 'intanmaharanii', followers: 58_000, engagementRate: 9.1 },
    ],
    rates: { ig_feed: 2_000_000, ig_reels: 3_000_000, ig_story: 800_000, tiktok_video: 3_000_000 },
  },
  {
    id: 'k09', name: 'Rizky Hidayat', category: 'Otomotif', city: 'Depok',
    platforms: [
      { platform: 'Instagram', handle: 'rizkyscootlife', followers: 9_200, engagementRate: 8.8 },
      { platform: 'TikTok', handle: 'rizkyscootlife', followers: 14_500, engagementRate: 10.2 },
    ],
    rates: { ig_feed: 600_000, ig_reels: 1_000_000, ig_story: 300_000, tiktok_video: 1_000_000 },
  },
  {
    id: 'k10', name: 'Maya Anggraini', category: 'Travel', city: 'Bali',
    platforms: [
      { platform: 'Instagram', handle: 'mayakeliling', followers: 610_000, engagementRate: 3.3 },
      { platform: 'YouTube', handle: 'mayakeliling', followers: 230_000, engagementRate: 4.0 },
    ],
    rates: { ig_feed: 24_000_000, ig_reels: 32_000_000, ig_story: 9_000_000, yt_dedicated: 40_000_000, yt_integration: 22_000_000 },
  },
  {
    id: 'k11', name: 'Dimas Arya', category: 'Otomotif', city: 'Jakarta',
    platforms: [
      { platform: 'TikTok', handle: 'dimasmotovlog', followers: 340_000, engagementRate: 7.5 },
      { platform: 'YouTube', handle: 'dimasmotovlog', followers: 150_000, engagementRate: 5.1 },
    ],
    rates: { tiktok_video: 16_000_000, yt_dedicated: 18_000_000, yt_integration: 10_000_000 },
  },
  {
    id: 'k12', name: 'Ayu Kartika', category: 'Family', city: 'Semarang',
    platforms: [
      { platform: 'Instagram', handle: 'ayukeluargakecil', followers: 23_000, engagementRate: 7.2 },
    ],
    rates: { ig_feed: 1_200_000, ig_reels: 2_000_000, ig_story: 500_000 },
  },
  {
    id: 'k13', name: 'Kevin Halim', category: 'Tech', city: 'Medan',
    platforms: [
      { platform: 'Instagram', handle: 'kevingadget', followers: 125_000, engagementRate: 4.0 },
      { platform: 'TikTok', handle: 'kevingadget', followers: 270_000, engagementRate: 6.6 },
    ],
    rates: { ig_feed: 6_000_000, ig_reels: 9_000_000, ig_story: 2_500_000, tiktok_video: 12_000_000 },
  },
  {
    id: 'k14', name: 'Putri Wulandari', category: 'Komedi', city: 'Jakarta',
    platforms: [
      { platform: 'Instagram', handle: 'putriwulan.lucu', followers: 1_800_000, engagementRate: 2.6 },
      { platform: 'TikTok', handle: 'putriwulan.lucu', followers: 3_100_000, engagementRate: 7.8 },
      { platform: 'YouTube', handle: 'putriwulanlucu', followers: 520_000, engagementRate: 3.5 },
    ],
    rates: { ig_feed: 60_000_000, ig_reels: 85_000_000, ig_story: 25_000_000, tiktok_video: 95_000_000, yt_dedicated: 110_000_000, yt_integration: 65_000_000 },
  },
]

export const CATEGORIES = Array.from(new Set(KOLS.map(k => k.category))).sort()

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export function formatIDR(n: number): string {
  return idr.format(n)
}

export function formatShortIDR(n: number): string {
  if (n >= 1_000_000_000) return `Rp${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000) return `Rp${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (n >= 1_000) return `Rp${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  return `Rp${n}`
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}M`
  if (n >= 1_000) return `${(n / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}K`
  return String(n)
}
