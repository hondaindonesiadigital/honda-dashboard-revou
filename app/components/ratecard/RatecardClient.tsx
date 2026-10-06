'use client'

import { useMemo, useState } from 'react'
import {
  CATEGORIES,
  DELIVERABLES,
  DELIVERABLE_BY_KEY,
  KOLS,
  TIERS,
  followersOn,
  formatCompact,
  formatIDR,
  formatShortIDR,
  maxFollowers,
  profileUrl,
  tierFor,
  type DeliverableKey,
  type Kol,
  type Platform,
  type TierName,
} from '@/lib/kol-ratecard'

type SortKey = 'followers' | 'rate_low' | 'rate_high' | 'er' | 'name'

interface LineItem {
  kolId: string
  deliverable: DeliverableKey
  qty: number
}

const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'YouTube']

const PLATFORM_COLOR: Record<Platform, string> = {
  Instagram: '#C13584',
  TikTok: '#111827',
  YouTube: '#FF0000',
}

const KOL_BY_ID = Object.fromEntries(KOLS.map(k => [k.id, k])) as Record<string, Kol>

function minRate(k: Kol): number {
  return Math.min(...Object.values(k.rates))
}

function bestER(k: Kol): number {
  return Math.max(...k.platforms.map(p => p.engagementRate))
}

function csvCell(v: string | number): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const selectStyle: React.CSSProperties = {
  border: '1px solid #E5E7EB',
  background: '#fff',
  fontSize: 13,
  padding: '8px 10px',
  borderRadius: 2,
  color: '#111827',
}

export default function RatecardClient() {
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState<Platform | 'all'>('all')
  const [tier, setTier] = useState<TierName | 'all'>('all')
  const [category, setCategory] = useState<string>('all')
  const [sort, setSort] = useState<SortKey>('followers')
  const [items, setItems] = useState<LineItem[]>([])
  const [agencyFee, setAgencyFee] = useState(10)
  const [taxRate, setTaxRate] = useState(11)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = KOLS.filter(k => {
      if (q && !(
        k.name.toLowerCase().includes(q) ||
        k.city.toLowerCase().includes(q) ||
        k.platforms.some(p => p.handle.toLowerCase().includes(q))
      )) return false
      if (platform !== 'all' && !k.platforms.some(p => p.platform === platform)) return false
      if (tier !== 'all' && tierFor(maxFollowers(k)).name !== tier) return false
      if (category !== 'all' && k.category !== category) return false
      return true
    })
    const followersKey = (k: Kol) => (platform === 'all' ? maxFollowers(k) : followersOn(k, platform))
    return list.sort((a, b) => {
      switch (sort) {
        case 'rate_low': return minRate(a) - minRate(b)
        case 'rate_high': return minRate(b) - minRate(a)
        case 'er': return bestER(b) - bestER(a)
        case 'name': return a.name.localeCompare(b.name)
        default: return followersKey(b) - followersKey(a)
      }
    })
  }, [query, platform, tier, category, sort])

  function addItem(kolId: string, deliverable: DeliverableKey) {
    setItems(prev => {
      const i = prev.findIndex(it => it.kolId === kolId && it.deliverable === deliverable)
      if (i === -1) return [...prev, { kolId, deliverable, qty: 1 }]
      return prev.map((it, j) => (j === i ? { ...it, qty: it.qty + 1 } : it))
    })
  }

  function setQty(index: number, qty: number) {
    setItems(prev => (qty <= 0 ? prev.filter((_, j) => j !== index) : prev.map((it, j) => (j === index ? { ...it, qty } : it))))
  }

  const lines = items.map(it => {
    const kol = KOL_BY_ID[it.kolId]
    const d = DELIVERABLE_BY_KEY[it.deliverable]
    const rate = kol.rates[it.deliverable] ?? 0
    return {
      ...it,
      kol,
      d,
      rate,
      cost: rate * it.qty,
      reach: Math.round(followersOn(kol, d.platform) * d.reachRate * it.qty),
    }
  })
  const subtotal = lines.reduce((s, l) => s + l.cost, 0)
  const fee = Math.round(subtotal * (agencyFee / 100))
  const tax = Math.round((subtotal + fee) * (taxRate / 100))
  const total = subtotal + fee + tax
  const reach = lines.reduce((s, l) => s + l.reach, 0)
  const cpm = reach > 0 ? (subtotal / reach) * 1000 : 0
  const isInPlan = (kolId: string, d: DeliverableKey) => items.some(it => it.kolId === kolId && it.deliverable === d)

  function exportCSV() {
    const rows: (string | number)[][] = [
      ['KOL', 'Kategori', 'Platform', 'Deliverable', 'Rate (IDR)', 'Qty', 'Subtotal (IDR)', 'Est. Reach'],
      ...lines.map(l => [l.kol.name, l.kol.category, l.d.platform, l.d.label, l.rate, l.qty, l.cost, l.reach]),
      [],
      ['Subtotal', '', '', '', '', '', subtotal, reach],
      [`Agency fee ${agencyFee}%`, '', '', '', '', '', fee, ''],
      [`PPN ${taxRate}%`, '', '', '', '', '', tax, ''],
      ['Total', '', '', '', '', '', total, ''],
    ]
    const csv = rows.map(r => r.map(csvCell).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kol-campaign-estimate.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Hero */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="cat-tag text-white" style={{ background: '#E62533' }}>KOL Ratecard</span>
          <span className="cat-tag" style={{ background: '#FEF3C7', color: '#92400E' }}>Data contoh — ganti dengan rate resmi</span>
        </div>
        <h2 className="font-poppins font-bold" style={{ fontSize: 26, lineHeight: 1.2, color: '#111827' }}>
          Ratecard Key Opinion Leader
        </h2>
        <p className="mt-1" style={{ fontSize: 14, color: '#555555', maxWidth: 680 }}>
          Bandingkan rate KOL per deliverable di Instagram, TikTok, dan YouTube, lalu susun estimasi
          budget kampanye lengkap dengan proyeksi reach dan CPM.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Total KOL" value={String(KOLS.length)} />
          <Stat label="Kategori" value={String(CATEGORIES.length)} />
          <Stat label="Total followers" value={formatCompact(KOLS.reduce((s, k) => s + k.platforms.reduce((t, p) => t + p.followers, 0), 0))} />
          <Stat label="Rate mulai dari" value={formatShortIDR(Math.min(...KOLS.map(minRate)))} />
        </div>
      </section>

      {/* Tier reference */}
      <section className="mb-6">
        <h3 className="font-roboto font-bold uppercase mb-2" style={{ fontSize: 13, letterSpacing: 0.5, color: '#333333' }}>
          Referensi Tier (rate IG Reels per post)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {TIERS.map(t => {
            const active = tier === t.name
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setTier(active ? 'all' : t.name)}
                className="text-left bg-white p-3"
                style={{ border: `1px solid ${active ? t.color : '#E5E7EB'}`, borderTop: `3px solid ${t.color}`, cursor: 'pointer' }}
              >
                <div className="font-poppins font-semibold" style={{ fontSize: 14, color: '#111827' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#555555' }}>
                  {formatCompact(t.minFollowers)}{t.maxFollowers ? ` – ${formatCompact(t.maxFollowers)}` : '+'} followers
                </div>
                <div className="mt-1 font-semibold" style={{ fontSize: 12, color: '#111827' }}>
                  {formatShortIDR(t.reelsRange[0])} – {formatShortIDR(t.reelsRange[1])}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        <div className="min-w-0">
          {/* Filters */}
          <div className="bg-white p-3 mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5" style={{ border: '1px solid #E5E7EB' }}>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Cari nama, handle, kota…"
              aria-label="Cari KOL"
              className="sm:col-span-2 lg:col-span-1"
              style={selectStyle}
            />
            <select aria-label="Platform" value={platform} onChange={e => setPlatform(e.target.value as Platform | 'all')} style={selectStyle}>
              <option value="all">Semua platform</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select aria-label="Tier" value={tier} onChange={e => setTier(e.target.value as TierName | 'all')} style={selectStyle}>
              <option value="all">Semua tier</option>
              {TIERS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
            </select>
            <select aria-label="Kategori" value={category} onChange={e => setCategory(e.target.value)} style={selectStyle}>
              <option value="all">Semua kategori</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select aria-label="Urutkan" value={sort} onChange={e => setSort(e.target.value as SortKey)} style={selectStyle}>
              <option value="followers">Followers terbanyak</option>
              <option value="er">Engagement tertinggi</option>
              <option value="rate_low">Rate termurah</option>
              <option value="rate_high">Rate termahal</option>
              <option value="name">Nama A–Z</option>
            </select>
          </div>

          <p className="mb-3" style={{ fontSize: 12, color: '#555555' }}>
            Menampilkan {filtered.length} dari {KOLS.length} KOL. Klik rate untuk menambahkan ke estimasi.
          </p>

          {filtered.length === 0 ? (
            <div className="bg-white p-8 text-center" style={{ border: '1px solid #E5E7EB', color: '#555555', fontSize: 14 }}>
              Tidak ada KOL yang cocok dengan filter.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map(k => (
                <KolCard key={k.id} kol={k} platformFilter={platform} onAdd={addItem} isInPlan={isInPlan} />
              ))}
            </div>
          )}
        </div>

        {/* Estimator */}
        <aside id="estimasi" className="bg-white lg:sticky scroll-mt-20" style={{ border: '1px solid #E5E7EB', borderTop: '3px solid #E62533', top: 88 }}>
          <div className="p-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <h3 className="font-poppins font-semibold" style={{ fontSize: 16, color: '#111827' }}>Estimasi Kampanye</h3>
            <p style={{ fontSize: 12, color: '#555555' }}>{lines.length} item · {lines.reduce((s, l) => s + l.qty, 0)} konten</p>
          </div>

          {lines.length === 0 ? (
            <p className="p-4" style={{ fontSize: 13, color: '#555555' }}>
              Belum ada item. Pilih deliverable pada kartu KOL untuk mulai menyusun budget.
            </p>
          ) : (
            <ul className="max-h-[340px] overflow-y-auto">
              {lines.map((l, i) => (
                <li key={`${l.kolId}-${l.deliverable}`} className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate" style={{ fontSize: 13, color: '#111827' }}>{l.kol.name}</div>
                    <div style={{ fontSize: 12, color: '#555555' }}>{l.d.label} · {formatShortIDR(l.rate)}</div>
                  </div>
                  <div className="flex items-center" style={{ border: '1px solid #E5E7EB' }}>
                    <QtyButton label={`Kurangi ${l.d.label} ${l.kol.name}`} onClick={() => setQty(i, l.qty - 1)}>−</QtyButton>
                    <span className="text-center" style={{ width: 28, fontSize: 13 }}>{l.qty}</span>
                    <QtyButton label={`Tambah ${l.d.label} ${l.kol.name}`} onClick={() => setQty(i, l.qty + 1)}>+</QtyButton>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="p-4 space-y-2" style={{ fontSize: 13 }}>
            <Row label="Subtotal" value={formatIDR(subtotal)} />
            <Row
              label={<PercentInput label="Agency fee" value={agencyFee} onChange={setAgencyFee} />}
              value={formatIDR(fee)}
            />
            <Row
              label={<PercentInput label="PPN" value={taxRate} onChange={setTaxRate} />}
              value={formatIDR(tax)}
            />
            <div className="flex justify-between items-baseline pt-2" style={{ borderTop: '1px solid #E5E7EB' }}>
              <span className="font-semibold" style={{ color: '#111827' }}>Total</span>
              <span className="font-poppins font-bold" style={{ fontSize: 18, color: '#E62533' }}>{formatIDR(total)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <MiniStat label="Est. reach" value={formatCompact(reach)} />
              <MiniStat label="Est. CPM" value={cpm ? formatShortIDR(Math.round(cpm)) : '–'} />
            </div>
            <p style={{ fontSize: 11, color: '#999999' }}>
              Reach diproyeksikan dari followers × rata-rata jangkauan per format; CPM dihitung dari subtotal sebelum fee & pajak.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={exportCSV}
                disabled={lines.length === 0}
                className="flex-1 text-white font-semibold"
                style={{ background: lines.length ? '#E62533' : '#F3A3A9', padding: '9px 12px', fontSize: 13, border: 'none', cursor: lines.length ? 'pointer' : 'not-allowed' }}
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => setItems([])}
                disabled={lines.length === 0}
                className="font-semibold"
                style={{ background: '#fff', color: '#333333', padding: '9px 12px', fontSize: 13, border: '1px solid #E5E7EB', cursor: lines.length ? 'pointer' : 'not-allowed' }}
              >
                Reset
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile summary bar: the estimator sits below the list on small screens */}
      {lines.length > 0 && (
        <a
          href="#estimasi"
          className="lg:hidden fixed left-4 right-4 bottom-4 z-40 flex items-center justify-between text-white"
          style={{ background: '#E62533', padding: '12px 16px', textDecoration: 'none', boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}
        >
          <span style={{ fontSize: 13 }}>{lines.reduce((s, l) => s + l.qty, 0)} konten · Lihat estimasi</span>
          <span className="font-poppins font-bold" style={{ fontSize: 15 }}>{formatShortIDR(total)}</span>
        </a>
      )}
    </div>
  )
}

function KolCard({
  kol,
  platformFilter,
  onAdd,
  isInPlan,
}: {
  kol: Kol
  platformFilter: Platform | 'all'
  onAdd: (kolId: string, d: DeliverableKey) => void
  isInPlan: (kolId: string, d: DeliverableKey) => boolean
}) {
  const t = tierFor(maxFollowers(kol))
  const deliverables = DELIVERABLES.filter(
    d => kol.rates[d.key] != null && (platformFilter === 'all' || d.platform === platformFilter),
  )
  const initials = kol.name.split(' ').map(w => w[0]).slice(0, 2).join('')

  return (
    <article className="bg-white p-4 flex flex-col gap-3" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center font-poppins font-bold text-white flex-shrink-0"
          style={{ width: 44, height: 44, borderRadius: '50%', background: t.color, fontSize: 15 }}
          aria-hidden
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-poppins font-semibold truncate" style={{ fontSize: 15, color: '#111827' }}>{kol.name}</div>
          <div style={{ fontSize: 12, color: '#555555' }}>{kol.category} · {kol.city}</div>
        </div>
        <span className="cat-tag text-white flex-shrink-0" style={{ background: t.color }}>{t.name}</span>
      </div>

      <div className="flex flex-col gap-1">
        {kol.platforms.map(p => (
          <a
            key={p.platform}
            href={profileUrl(p)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
            style={{ fontSize: 12, color: '#333333', textDecoration: 'none' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PLATFORM_COLOR[p.platform], flexShrink: 0 }} />
            <span className="truncate flex-1">{p.platform} · @{p.handle}</span>
            <span className="font-semibold" style={{ color: '#111827' }}>{formatCompact(p.followers)}</span>
            <span style={{ color: '#059669', width: 64, textAlign: 'right', whiteSpace: 'nowrap' }}>ER {p.engagementRate.toLocaleString('id-ID')}%</span>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5 mt-auto">
        {deliverables.map(d => {
          const added = isInPlan(kol.id, d.key)
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onAdd(kol.id, d.key)}
              title="Tambahkan ke estimasi"
              className="text-left"
              style={{
                border: `1px solid ${added ? '#E62533' : '#E5E7EB'}`,
                background: added ? '#FEF2F2' : '#F9FAFB',
                padding: '6px 8px',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, color: '#555555' }}>{d.label}</div>
              <div className="font-semibold flex justify-between" style={{ fontSize: 13, color: '#111827' }}>
                {formatShortIDR(kol.rates[d.key]!)}
                <span style={{ color: '#E62533' }}>{added ? '✓' : '+'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </article>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white p-3" style={{ border: '1px solid #E5E7EB' }}>
      <div style={{ fontSize: 11, color: '#555555', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div className="font-poppins font-bold" style={{ fontSize: 20, color: '#111827' }}>{value}</div>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2" style={{ background: '#F7F7F7' }}>
      <div style={{ fontSize: 11, color: '#555555' }}>{label}</div>
      <div className="font-semibold" style={{ fontSize: 14, color: '#111827' }}>{value}</div>
    </div>
  )
}

function Row({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <div className="flex justify-between items-center gap-2" style={{ color: '#333333' }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function PercentInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex items-center gap-1.5">
      {label}
      <input
        type="number"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
        style={{ width: 48, border: '1px solid #E5E7EB', padding: '2px 4px', fontSize: 12 }}
      />
      %
    </label>
  )
}

function QtyButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{ width: 26, height: 26, background: '#F9FAFB', border: 'none', cursor: 'pointer', fontSize: 14, color: '#333333' }}
    >
      {children}
    </button>
  )
}
