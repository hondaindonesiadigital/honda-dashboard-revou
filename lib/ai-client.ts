// ─────────────────────────────────────────────────────────────────────────────
// AI CLIENT — which provider the pillar classifier talks to.
//
// OpenRouter speaks the OpenAI Chat Completions API, so both providers use the
// same `openai` SDK; only the base URL, the key, and the model id differ.
//
// SELECTION: OPENROUTER_API_KEY wins if set, otherwise OPENAI_API_KEY. Nothing
// else changes — set the one key you have and the classifier follows.
//
// MODEL IDS ARE NOT INTERCHANGEABLE: OpenRouter namespaces them by vendor
// (`openai/gpt-4o-mini`), OpenAI does not (`gpt-4o-mini`). classifyModel()
// picks the right default for whichever provider is active; set CLASSIFY_MODEL
// to override (use the id exactly as that provider spells it).
//
// The model must accept images — the classifier's primary path sends a caption
// plus a base64 post thumbnail, and falls back to caption-only text.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from 'openai'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

const DEFAULT_MODEL_OPENROUTER = 'openai/gpt-4o-mini'
const DEFAULT_MODEL_OPENAI = 'gpt-4o-mini'

/** True when the OpenRouter key is set, so OpenRouter is the active provider. */
export function usingOpenRouter(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim())
}

/** True when some provider key is configured. Routes guard on this before
 *  classifying, so a missing key returns a clean 500 instead of throwing. */
export function hasAIKey(): boolean {
  return usingOpenRouter() || Boolean(process.env.OPENAI_API_KEY?.trim())
}

/** The chat model to classify with, defaulted per active provider. */
export function classifyModel(): string {
  const override = process.env.CLASSIFY_MODEL?.trim()
  if (override) return override
  return usingOpenRouter() ? DEFAULT_MODEL_OPENROUTER : DEFAULT_MODEL_OPENAI
}

// Lazily constructed: the SDK throws on a missing key at construction time, and
// `next build` imports this module while collecting page data for the routes
// that classify. Building the client on first call keeps the key a request-time
// concern instead of a build-time one.
let _client: OpenAI | null = null

export function getAIClient(): OpenAI {
  if (_client) return _client

  if (usingOpenRouter()) {
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: OPENROUTER_BASE_URL,
      // Optional OpenRouter attribution — identifies this app in the account's
      // activity log. Harmless if the headers are ignored.
      defaultHeaders: { 'X-Title': 'Honda Digital Content Intelligence' },
    })
  } else {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }

  return _client
}
