import { getInstagramAccounts, getTopPosts, getTrendData, getLatestPostDate } from '@/lib/instagram-data'
import type { DateRange } from '@/lib/instagram-data'
import type { InstagramAccount, Post, TrendRawPost } from '@/lib/types'
import { describeDataError } from '@/lib/data-error'
import DataErrorBanner from '../components/DataErrorBanner'
import Header from '../components/Header'
import PostsSection from '../components/PostsSection'
import InstagramSection from '../components/InstagramSection'
import TrendSection from '../components/TrendSection'
import Footer from '../components/Footer'
import { logout } from '@/app/actions/auth'
import { getCurrentUser } from '@/lib/auth-db'
import type { DashboardUser } from '@/lib/auth-db'

// Earliest date the dashboard offers. Matches POST_DATE_CUTOFF_STR in
// lib/run-update.ts — the floor the pipeline refuses to store below.
const MIN_DATE = '2026-01-01'

function getYesterday(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Returns the two most recent complete Mon–Sun weeks: the last Sunday on or
// before `anchor`, back to the Monday 13 days prior.
function getLastTwoWeeks(anchor: string): { from: string; to: string } {
  const d = new Date(anchor + 'T00:00:00Z')
  const dow = d.getUTCDay() // 0 = Sun, 1 = Mon, ... 6 = Sat
  // Step back to the most recent Sunday (if anchor is Sunday, use it).
  const daysSinceSunday = dow === 0 ? 0 : dow
  const sunday = new Date(d)
  sunday.setUTCDate(sunday.getUTCDate() - daysSinceSunday)
  const monday = new Date(sunday)
  monday.setUTCDate(monday.getUTCDate() - 13)
  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  }
}

function formatDateLabel(from: string, to: string): string {
  const f = new Date(from + 'T00:00:00Z')
  const t = new Date(to + 'T00:00:00Z')
  const sameYear = f.getUTCFullYear() === t.getUTCFullYear()
  const sameMonth = sameYear && f.getUTCMonth() === t.getUTCMonth()

  if (sameMonth) {
    const monthYear = t.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return `${f.getUTCDate()} – ${t.getUTCDate()} ${monthYear}`
  }
  const fLabel = f.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  const tLabel = t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  return `${fLabel} – ${tLabel}`
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const [params, latestDate] = await Promise.all([
    searchParams,
    getLatestPostDate(),
  ])

  let from = params.from ?? MIN_DATE
  let to = params.to ?? getYesterday()
  if (from > to) [from, to] = [to, from]

  const dateRange: DateRange = { from, to }
  const dateLabel = formatDateLabel(from, to)
  const maxDate = latestDate ?? MIN_DATE

  // Top 10 Post considers the two most recent complete weeks (Mon–Sun),
  // always anchored to today's actual date regardless of the date picker.
  const today = new Date().toISOString().slice(0, 10)
  const lastTwoWeeks = getLastTwoWeeks(today)
  const topRange: DateRange = { from: lastTwoWeeks.from, to: lastTwoWeeks.to }
  const topDateLabel = formatDateLabel(lastTwoWeeks.from, lastTwoWeeks.to)

  // The three data reads throw DataUnavailableError when Supabase does not
  // answer, instead of returning [] — otherwise an outage is indistinguishable
  // from an empty database, which is what kept the dashboard silently blank
  // for days in early November. Catch it here so the page still renders, with
  // a banner that says what actually went wrong.
  let instagramAccounts: InstagramAccount[] = []
  let topPosts: Post[] = []
  let trendPosts: TrendRawPost[] = []
  let dataError: { headline: string; hint: string; detail: string } | null = null

  try {
    ;[instagramAccounts, topPosts, trendPosts] = await Promise.all([
      getInstagramAccounts(dateRange),
      getTopPosts(topRange),
      getTrendData(dateRange),
    ])
  } catch (err) {
    dataError = describeDataError(err)
    console.error('[dashboard] data read failed:', err)
  }

  // Only decides whether the admin link shows. The proxy has already verified
  // the session, so a database hiccup here must not take the whole page down.
  let currentUser: DashboardUser | null = null
  try {
    currentUser = await getCurrentUser()
  } catch (err) {
    console.error('[dashboard] could not load the current user:', err)
  }

  const totalPosts = instagramAccounts.reduce((s, a) => s + a.post_count, 0)

  return (
    <>
      <Header
        dateFrom={from}
        dateTo={to}
        minDate={MIN_DATE}
        maxDate={maxDate}
        accountCount={10}
        accounts={[
          '@hondaaristadepok.official',
          '@hondaaristajatinegara.id',
          '@hondaaristamanggadua.id',
          '@hondamulyaputra',
          '@honda.autobest',
          '@hondaanugerah_official',
          '@hondabintang_official',
          '@hondadaim',
          '@hondamandalasenamlg',
          '@hondamajupalembang',
        ]}
        postCount={totalPosts}
        logoutAction={logout as () => Promise<void>}
        isAdmin={currentUser?.is_admin ?? false}
      />
      <main className="max-w-screen-xl mx-auto px-6 pb-16">
        {dataError ? (
          <DataErrorBanner {...dataError} />
        ) : (
          <>
            <InstagramSection accounts={instagramAccounts} dateLabel={dateLabel} dateFrom={from} dateTo={to} />
            <TrendSection posts={trendPosts} dateLabel={dateLabel} />
            <PostsSection posts={topPosts} dateLabel={topDateLabel} />
          </>
        )}
      </main>
      <Footer />
    </>
  )
}
