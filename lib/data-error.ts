/**
 * Why this exists.
 *
 * Every dashboard query used to read `const { data } = await ...` and drop the
 * `error` beside it. A Supabase outage therefore reached the page as an empty
 * array and rendered as "No data yet" — the same screen as a database that is
 * simply empty. In early November the project was paused on Supabase's Free
 * plan and the dashboard sat blank for days while the Google Sheet still held
 * every row; three days went into finding that out, because nothing anywhere
 * said "the database did not answer".
 *
 * So: a failed read now throws DataUnavailableError, and the page says so.
 *
 * Throwing also fixes a second, quieter problem. The getters are cached with
 * cacheLife('max'), and an empty array returned during an outage was a
 * perfectly good cache entry — it could outlive the outage and keep the
 * dashboard blank after the database came back. A thrown error is not cached,
 * so the next request retries for real.
 */

export class DataUnavailableError extends Error {
  /** The underlying Supabase/PostgREST error or thrown value. */
  readonly cause: unknown
  /** Which read failed, e.g. 'instagram_posts'. */
  readonly source: string

  constructor(source: string, cause: unknown) {
    super(`Could not read ${source} from Supabase: ${detailOf(cause)}`)
    this.name = 'DataUnavailableError'
    this.source = source
    this.cause = cause
  }
}

/** Best-effort one-line detail from a PostgrestError, Error, or anything else. */
function detailOf(cause: unknown): string {
  if (cause == null) return 'no detail given'
  if (typeof cause === 'string') return cause
  if (typeof cause === 'object') {
    const o = cause as Record<string, unknown>
    const parts = [o.message, o.details, o.hint].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    )
    const code = typeof o.code === 'string' && o.code ? ` (${o.code})` : ''
    if (parts.length) return parts.join(' — ') + code
  }
  return String(cause)
}

/** Throws DataUnavailableError when `error` is set. Returns otherwise. */
export function throwIfUnavailable(source: string, error: unknown): void {
  if (error) throw new DataUnavailableError(source, error)
}

export function isDataUnavailable(err: unknown): err is DataUnavailableError {
  return err instanceof DataUnavailableError
}

/**
 * Turns any thrown value into something a person can act on. The headline is
 * plain language; `detail` is the raw message, shown small, for whoever has to
 * fix it. Deliberately does NOT say "no data" — the whole point is to stop
 * conflating an outage with an empty table.
 */
export function describeDataError(err: unknown): { headline: string; hint: string; detail: string } {
  const detail = err instanceof Error ? err.message : String(err)
  const low = detail.toLowerCase()

  // A paused Supabase project, a DNS failure, or a dropped connection.
  if (
    low.includes('fetch failed') ||
    low.includes('econnrefused') ||
    low.includes('enotfound') ||
    low.includes('etimedout') ||
    low.includes('network') ||
    low.includes('paused')
  ) {
    return {
      headline: 'Could not reach the database',
      hint: 'The Supabase project may be paused or restarting. Open the Supabase dashboard and check that the project status is Healthy, then reload this page.',
      detail,
    }
  }

  // Key revoked, rotated, or row-level security blocking the read.
  if (
    low.includes('jwt') ||
    low.includes('api key') ||
    low.includes('apikey') ||
    low.includes('permission') ||
    low.includes('not authorized') ||
    low.includes('unauthorized') ||
    low.includes('row-level security')
  ) {
    return {
      headline: 'The database refused the request',
      hint: 'The Supabase key looks wrong, expired, or is being blocked by a row-level security policy. Check NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Vercel project settings.',
      detail,
    }
  }

  return {
    headline: 'The database returned an error',
    hint: 'This is not an empty dashboard — the query itself failed. The technical detail below is what Supabase replied.',
    detail,
  }
}
