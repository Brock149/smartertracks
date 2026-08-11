/**
 * Shared Haiku keyword generation for tool search.
 * Best of both worlds:
 *  - slang / nicknames workers actually type
 *  - useful name reorderings / short forms (trigram helps typos, but word-order
 *    swaps and distinctive short phrases are more reliable as keywords)
 */

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

function normalizeTokens(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

function normalizePhrase(text: string): string {
  return normalizeTokens(text).join(' ')
}

/** Looks like warehouse/location storage text, not a tool nickname. */
function looksLikeLocationJunk(alias: string): boolean {
  const t = alias.toLowerCase()
  if (/\b(rack|shelf|aisle|bin|bay|row)\s*\d+/i.test(t)) return true
  if (/\b(wh|tr|wrh|warehouse|tool\s*room)\b/i.test(t) && /\b(rack|shelf|aisle|bin)\b/i.test(t)) {
    return true
  }
  // Pure location-code style: "wh tr", "tr floor"
  if (/^(wh|tr|wrh)(\s+(wh|tr|wrh|floor|rack|shelf))+$/i.test(t.trim())) return true
  return false
}

/**
 * Deterministic word-order / short-form variants for multi-word names.
 * e.g. "propress ridgid" → "ridgid propress"
 */
export function nameOrderVariants(name: string): string[] {
  const tokens = normalizeTokens(name)
  if (tokens.length < 2 || tokens.length > 4) return []

  const full = tokens.join(' ')
  const out: string[] = []

  if (tokens.length === 2) {
    out.push(`${tokens[1]} ${tokens[0]}`)
  } else if (tokens.length === 3) {
    out.push(`${tokens[1]} ${tokens[2]} ${tokens[0]}`)
    out.push(`${tokens[2]} ${tokens[0]} ${tokens[1]}`)
    out.push(`${tokens[1]} ${tokens[0]} ${tokens[2]}`)
    out.push(`${tokens[0]} ${tokens[1]}`)
    out.push(`${tokens[1]} ${tokens[2]}`)
    out.push(`${tokens[0]} ${tokens[2]}`)
  } else {
    // 4 words: reverse halves + adjacent pairs (keep it light)
    out.push([...tokens].reverse().join(' '))
    out.push(`${tokens[0]} ${tokens[1]}`)
    out.push(`${tokens[2]} ${tokens[3]}`)
    out.push(`${tokens[1]} ${tokens[2]} ${tokens[3]}`)
  }

  return [...new Set(out.filter((v) => v && v !== full))]
}

export function cleanAliasList(aliases: string[], name: string, max = 12): string[] {
  const nameNorm = normalizePhrase(name)
  const seen = new Set<string>()
  const out: string[] = []

  for (const raw of aliases) {
    const alias = String(raw || '').trim().toLowerCase()
    if (!alias || alias.length > 80) continue
    const norm = normalizePhrase(alias)
    if (!norm || norm === nameNorm) continue
    if (looksLikeLocationJunk(alias)) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    out.push(alias)
    if (out.length >= max) break
  }

  return out
}

export async function generateAliasesWithHaiku(name: string): Promise<string[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const toolName = (name || '').trim()
  if (!toolName) return []

  const prompt = `You generate search KEYWORDS for a construction / trades tool inventory app.

Workers type what they remember: slang, nicknames, brand+product in any order, or a short phrase from the tool name.

Tool name: "${toolName}"

Return ONLY a JSON array of short lowercase keywords (max 12). Mix BOTH of these:

1) SLANG / NICKNAMES (highest value when they exist)
   - Jobsite slang, brand nicknames, trade shorthand people actually say/type
   - Examples: "sawzall" for reciprocating saw, "skilsaw" for circular saw,
     "channel locks" for tongue-and-groove pliers, "crescent wrench" for adjustable wrench,
     "propress" / "press tool" style short names when relevant
   - Common misspellings of those nicknames are OK

2) USEFUL NAME VARIANTS (always valuable for multi-word names)
   - Different word orders of brand + product (e.g. name "ProPress Ridgid" → "ridgid propress")
   - Natural short forms / distinctive phrases from the name (drop filler words, keep the words people type)
   - Stemming / ending variants of distinctive words (clamp/clamps, press/pressing) when helpful

Rules:
- Do NOT include the exact tool name unchanged.
- Do NOT invent keywords from location/storage text. Ignore anything like rack/shelf/warehouse/tool-room codes (WH, TR, Rack 6, Shelf A). You are only given the tool name — stay on the tool itself.
- Prefer concrete searchable phrases (2–4 words or a strong single nickname) over tiny weak fragments.
- If slang is scarce, lean harder on useful name reorderings and short forms so the list is still helpful — aim for about 6–12 when the name has enough words to work with.
- No explanations — JSON array only.`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 350,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!resp.ok) {
    const body = await resp.text()
    throw new Error(`Anthropic API error (${resp.status}): ${body}`)
  }

  const json = await resp.json()
  const text = (json?.content || [])
    .filter((c: any) => c.type === 'text')
    .map((c: any) => c.text)
    .join('\n')
    .trim()

  const match = text.match(/\[[\s\S]*\]/)
  const fromAi: string[] = []
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed)) {
        for (const a of parsed) fromAi.push(String(a || ''))
      }
    } catch {
      // ignore bad JSON; still keep deterministic variants
    }
  }

  // Guarantee word-order coverage even if the model under-delivers.
  const merged = [...fromAi, ...nameOrderVariants(toolName)]
  return cleanAliasList(merged, toolName, 12)
}
