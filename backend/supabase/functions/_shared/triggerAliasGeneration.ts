/**
 * Fire-and-forget alias generation after tool create/edit.
 * Uses EdgeRuntime.waitUntil when available so work survives the response.
 */
export function triggerAliasGeneration(
  supabaseUrl: string,
  serviceKey: string,
  userJwt: string,
  toolId: string
): void {
  const run = async () => {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-tool-aliases`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userJwt}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tool_id: toolId }),
      })
      if (!resp.ok) {
        const text = await resp.text()
        console.error('triggerAliasGeneration failed', resp.status, text)
      }
    } catch (e) {
      console.error('triggerAliasGeneration error', e)
    }
  }

  const runtime = (globalThis as any).EdgeRuntime
  if (runtime?.waitUntil) {
    runtime.waitUntil(run())
  } else {
    void run()
  }
}
