/**
 * Sync Supabase `instagram_posts_export` view -> this Google Sheet.
 *
 * Pulls the dealer-joined Instagram-post data from Supabase's auto-generated
 * REST API and rewrites a sheet tab with it. One-way (Supabase is the source of
 * truth). Runs manually from the menu, or automatically on a daily time trigger.
 *
 * SETUP (one time):
 *   1. In the Sheet:  Extensions -> Apps Script
 *   2. Paste this whole file, replacing the default Code.gs contents.
 *   3. Run `setUpDailyTrigger` once (authorize when prompted) to schedule it.
 *   4. Reload the Sheet -> use the "Supabase Sync" menu -> "Sync now" to test.
 *
 * The publishable (anon) key below is safe to embed: the export view is
 * read-only and the underlying tables already have public SELECT enabled.
 *
 * ── SAFETY (added 2026-10-28, after a sync replaced ~13,000 rows with 375) ───
 * The old version paged by guessing — it stopped as soon as a page came back
 * shorter than PAGE_SIZE — and it cleared the whole sheet BEFORE it knew how
 * much data it actually had. One short page from Supabase was therefore enough
 * to wipe the tab and leave a fraction of the rows behind. Three changes stop
 * that happening again:
 *
 *   1. Paging stops only on an EMPTY page, never on a short one, and the offset
 *      advances by the number of rows actually received. Supabase trims
 *      responses that are too large or slow to build, so a short page is
 *      routine and must not be read as the end of the data. Where the
 *      Content-Range header gives a total, that is used as the finish line too.
 *   2. The fetch is sanity-checked against the previous successful sync. If it
 *      comes back with less than SAFETY_RATIO of last time's rows, the script
 *      THROWS and the sheet is left completely untouched.
 *   3. Only the synced columns (A..K) are cleared and rewritten, so anything
 *      you add to the right of them survives a sync.
 *
 * ── CAVEAT about your own columns ───────────────────────────────────────────
 * Rows are ordered newest-first, so new posts are inserted at the TOP and
 * everything below shifts down. Columns you add to the right therefore only
 * stay correct if they are FORMULAS that read the same row (e.g.
 * `=TEXT(DATEVALUE(LEFT(A2,10)),"yyyy-mm")`). Values you TYPE IN BY HAND will
 * end up next to a different post after the next sync. Keep hand-entered
 * annotations on a separate tab, keyed by post_url.
 */

const SUPABASE_URL = 'https://gywnxuoaiwbbqxckwymn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_o_tkpaXy_g5MMhtv2uEBkg__TVWeeGd';
const VIEW = 'instagram_posts_export';
const SHEET_TAB = 'IG Posts';           // tab this script writes to (created if missing)
const PAGE_SIZE = 500;                   // rows per request; 500 keeps each response small
const ORDER = 'post_date.desc';          // newest posts first

// Abort the sync if this run fetched less than this fraction of the previous
// successful run's row count. The dataset only grows, so a real drop means
// something went wrong upstream — better to keep yesterday's complete sheet
// than to overwrite it with a partial one. Set to 0 to disable the check.
const SAFETY_RATIO = 0.9;

// Hard stop so a misbehaving endpoint can never loop forever. At PAGE_SIZE 500
// this allows 100k rows, far above the real dataset.
const MAX_PAGES = 200;

const LAST_COUNT_KEY = 'lastSyncedRowCount';

// Column order written to the sheet (must match keys returned by the view).
const COLUMNS = [
  'post_date',
  'account_username',
  'main_dealer',
  'dealer_name',
  'pillar',
  'post_type',
  'likes_count',
  'comments_count',
  'views_count',
  'caption',
  'post_url',
];

/**
 * Fetch every row from the view.
 *
 * `Prefer: count=exact` makes Supabase report the full row count in the
 * Content-Range response header (`0-499/13421`). We page until we have that
 * many rows, so a short page — which is what silently truncated the old
 * version — no longer stops the loop. The page-length check is kept only as a
 * fallback for the case where no usable Content-Range comes back.
 *
 * Returns { rows, total } where `total` is the count Supabase reported, or
 * null if it did not report one.
 */
function fetchAllRows() {
  const rows = [];
  let offset = 0;
  let total = null;
  let pages = 0;

  while (true) {
    const url =
      SUPABASE_URL + '/rest/v1/' + VIEW +
      '?select=' + COLUMNS.join(',') +
      '&order=' + ORDER +
      '&limit=' + PAGE_SIZE +
      '&offset=' + offset;

    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
        Prefer: 'count=exact',
      },
      muteHttpExceptions: true,
    });

    // 206 Partial Content is normal once a count is requested.
    const code = res.getResponseCode();
    if (code !== 200 && code !== 206) {
      throw new Error('Supabase REST error ' + code + ': ' + res.getContentText());
    }

    if (total === null) {
      total = parseTotalFromContentRange(res.getAllHeaders());
    }

    const batch = JSON.parse(res.getContentText());

    // An EMPTY page is the only thing that means "no more rows". A SHORT page
    // does not: Supabase trims a response that is too large or too slow to
    // build, and captions make that common. Treating short as final is what
    // truncated the sheet to 375, then to 616 (500 + a trimmed 116). We keep
    // asking from wherever we got to and stop only when a page comes back with
    // nothing in it.
    if (batch.length === 0) break;

    for (let i = 0; i < batch.length; i++) rows.push(batch[i]);
    offset += batch.length;                // advance by what we ACTUALLY got
    pages++;

    if (total !== null && rows.length >= total) break;

    if (pages > MAX_PAGES) {
      throw new Error(
        'Gave up after ' + MAX_PAGES + ' requests with ' + rows.length +
        ' rows. Sheet left untouched. Lower PAGE_SIZE or drop the caption column.'
      );
    }
  }

  // Supabase promised more than it delivered — treat as a failed fetch rather
  // than quietly syncing a partial dataset.
  if (total !== null && rows.length < total) {
    throw new Error(
      'Incomplete fetch: got ' + rows.length + ' of ' + total + ' rows. ' +
      'Sheet left untouched. Re-run the sync; if it keeps happening, lower PAGE_SIZE.'
    );
  }

  return { rows: rows, total: total };
}

/** Pull the total out of a `Content-Range: 0-499/13421` header, else null. */
function parseTotalFromContentRange(headers) {
  const keys = Object.keys(headers);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i].toLowerCase() !== 'content-range') continue;
    const m = String(headers[keys[i]]).match(/\/(\d+)\s*$/);
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Overwrite the synced columns (A..K) with `rows`, leaving every column to the
 * right of them alone. Grows the sheet first if it has fewer rows than the data
 * needs, and blanks any leftover rows from a previous, longer sync.
 */
function writeRows(sheet, rows) {
  const numCols = COLUMNS.length;

  const values = [COLUMNS];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const line = [];
    for (let c = 0; c < numCols; c++) {
      const v = r[COLUMNS[c]];
      line.push(v === null || v === undefined ? '' : v);
    }
    values.push(line);
  }

  const needed = values.length;
  if (needed > sheet.getMaxRows()) {
    sheet.insertRowsAfter(sheet.getMaxRows(), needed - sheet.getMaxRows());
  }

  // Clear ONLY our columns — formulas and notes further right are preserved.
  sheet.getRange(1, 1, sheet.getMaxRows(), numCols).clearContent();
  sheet.getRange(1, 1, needed, numCols).setValues(values);
  sheet.setFrozenRows(1);
}

/** Main entry point: pull from Supabase and rewrite the synced columns. */
function syncSupabaseToSheet() {
  const result = fetchAllRows();
  const rows = result.rows;

  const props = PropertiesService.getDocumentProperties();
  const lastCount = Number(props.getProperty(LAST_COUNT_KEY) || 0);

  // Guard: refuse to overwrite a good sheet with a suspiciously small result.
  if (SAFETY_RATIO > 0 && lastCount > 0 && rows.length < lastCount * SAFETY_RATIO) {
    throw new Error(
      'Sync ABORTED — sheet NOT modified.\n\n' +
      'Fetched ' + rows.length + ' rows, but the last successful sync had ' +
      lastCount + '. That drop looks wrong, so the existing data was kept.\n\n' +
      'Try again. If it repeats, check the ' + VIEW + ' view in Supabase ' +
      '(SQL editor: select count(*) from ' + VIEW + ';).'
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_TAB);
  if (!sheet) sheet = ss.insertSheet(SHEET_TAB);

  writeRows(sheet, rows);
  props.setProperty(LAST_COUNT_KEY, String(rows.length));

  const delta = lastCount > 0 ? ' (' + (rows.length - lastCount >= 0 ? '+' : '') +
    (rows.length - lastCount) + ' vs last sync)' : '';
  ss.toast('Synced ' + rows.length + ' rows from Supabase.' + delta, 'Supabase Sync', 5);
}

/**
 * Clear the remembered row count, which disables the safety check for the next
 * run. Use this ONLY when the dataset legitimately shrank (e.g. the campaign
 * window was moved) and the abort is a false alarm.
 */
function resetSafetyBaseline() {
  PropertiesService.getDocumentProperties().deleteProperty(LAST_COUNT_KEY);
  SpreadsheetApp.getActiveSpreadsheet()
    .toast('Safety baseline cleared — the next sync will not be size-checked.', 'Supabase Sync', 5);
}

/** Run ONCE to schedule an automatic daily sync (~6am in the sheet's timezone). */
function setUpDailyTrigger() {
  // Remove any existing triggers for this function first (avoid duplicates).
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'syncSupabaseToSheet') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('syncSupabaseToSheet')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
}

/** Adds a "Supabase Sync" menu to the Sheet for manual runs. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Supabase Sync')
    .addItem('Sync now', 'syncSupabaseToSheet')
    .addItem('Set up daily auto-sync', 'setUpDailyTrigger')
    .addSeparator()
    .addItem('Reset safety baseline', 'resetSafetyBaseline')
    .addToUi();
}
