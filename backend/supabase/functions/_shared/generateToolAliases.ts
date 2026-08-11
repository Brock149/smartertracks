/**
 * Shared Haiku keyword generation for tool search.
 * Focus: slang / nicknames someone might type — NOT rearrangements of the name
 * (pg_trgm already covers typos and word-order variants of the real name).
 */

const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

function normalizeTokens(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

/** Drop keywords that are only subsets/reorderings of the tool name. */
export function filterNameReorders(aliases: string[], name: string): string[] {
  const nameTokens = new Set(normalizeTokens(name))
  return aliases.filter((alias) => {
    const tokens = normalizeTokens(alias)
    if (tokens.length === 0) return false
    // If every token already appears in the name, trigram search covers it.
    return !tokens.every((t) => nameTokens.has(t))
  })
}

export async function generateAliasesWithHaiku(name: string): Promise<string[]> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const toolName = (name || '').trim()
  if (!toolName) return []

  const prompt = `You generate search KEYWORDS for a construction / trades tool inventory app.

Workers search by what they CALL the tool on the jobsite — slang, nicknames, brand nicknames, and common short names — NOT by rearranging the catalog title.

Tool name: "${toolName}"

Return ONLY a JSON array of short lowercase keywords (max 10). Rules:
- FOCUS on slang / nicknames / alternate common names people actually say or type (e.g. "sawzall" for a reciprocating saw, "skilsaw" for a circular saw, "channel locks" for tongue-and-groove pliers, "crescent wrench" for an adjustable wrench).
- Include well-known brand nicknames and trade shorthand when they apply.
- A few common misspellings of those nicknames are OK.
- Do NOT include the exact tool name.
- Do NOT invent keywords by reordering, dropping, or reshuffling words from the tool name (e.g. do not turn "Metal spring clamps" into "spring metal clamps", "metal clamps", "clamps spring"). Fuzzy search already handles that.
- Do NOT use location codes, rack/shelf labels, warehouse abbreviations, or storage notes (e.g. "WH TR", "Rack 6", "Shelf A").
- If you are not confident there is real slang for this tool, return fewer keywords or []. Prefer fewer good nicknames over filler.
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
      max_tokens: 300,
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
  if (!match) return []

  const parsed = JSON.parse(match[0])
  if (!Array.isArray(parsed)) return []

  const cleaned = parsed
    .map((a) => String(a || '').trim().toLowerCase())
    .filter((a) => a.length > 0 && a.length <= 80)
    .slice(0, 10)

  return [...new Set(filterNameReorders(cleaned, toolName))]
}
