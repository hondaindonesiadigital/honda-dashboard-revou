/**
 * Shown when a dashboard query failed, in place of the sections that would
 * otherwise render as empty.
 *
 * The point is to never again let an outage look like an empty database. It
 * says plainly that the query failed, what to check first, and prints the raw
 * message from Supabase so whoever fixes it does not have to guess.
 */
export default function DataErrorBanner({
  headline,
  hint,
  detail,
}: {
  headline: string
  hint: string
  detail: string
}) {
  return (
    <section className="mt-8">
      <div className="bg-white" style={{ border: '1px solid #E5E7EB' }}>
        <div style={{ height: '4px', background: '#E62533' }} />
        <div className="px-6 py-7">
          <p className="font-roboto font-bold" style={{ fontSize: '18px', color: '#E62533' }}>
            {headline}
          </p>
          <p className="font-mulish mt-2" style={{ fontSize: '13px', color: '#333333', maxWidth: '68ch' }}>
            {hint}
          </p>
          <p className="font-mulish mt-4" style={{ fontSize: '12px', color: '#555555' }}>
            This is <strong>not</strong> the same as having no posts — the dashboard could not read
            the database at all, so no number on this page can be trusted right now. Nothing has
            been lost; the data is still in Supabase.
          </p>
          <details className="mt-4">
            <summary
              className="font-mulish"
              style={{ fontSize: '12px', color: '#9CA3AF', cursor: 'pointer' }}
            >
              Technical detail
            </summary>
            <pre
              className="mt-2"
              style={{
                background: '#F0F0F0',
                padding: '10px 12px',
                fontSize: '11px',
                color: '#333333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                overflowX: 'auto',
              }}
            >
              {detail}
            </pre>
          </details>
        </div>
      </div>
    </section>
  )
}
