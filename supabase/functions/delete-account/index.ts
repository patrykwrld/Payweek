// Deletes the calling user's account and everything attached to it.
//
// Google Play requires an in-app route to account deletion for any app that
// lets you create an account. Deleting an auth user needs the service role,
// which must never reach the client, so it happens here.
//
// The user is identified from their own access token. Nothing in the request
// body is trusted, so there is no way to ask this to delete somebody else.
//
// Every table hangs off auth.users with `on delete cascade` (rate_rules via
// its agency), so removing the user removes the profile, agencies, rate
// rules, shifts and payslips in one statement.
//
// ─────────────────────────────────────────────────────────────────────────
// Two things here are load-bearing and look optional. Both were learned the
// hard way, from a phone reporting "Failed to send a request to the Edge
// Function" while the function's own logs showed a clean `OPTIONS | 200`.
//
// 1. `Access-Control-Allow-Headers` MUST cover every header the client sends.
//
//    supabase-js sends `x-client-info` on every request, and has added
//    headers before. A preflight that answers 200 but omits one of them is
//    still a failed preflight: the browser refuses to send the real request,
//    and `fetch` rejects — so the app reports a network failure for a server
//    that answered perfectly. That is why the request headers are echoed back
//    rather than listed. A hard-coded list breaks silently the next time
//    supabase-js adds a header, and the symptom points at the network.
//
// 2. Deploy with `verify_jwt = false`.
//
//    Not a weakening. The gateway's check rejects a bad token *before* the
//    function runs, which means the rejection carries no CORS headers, which
//    means the browser blocks it and the person is told there is no network
//    — on the screen where they are deciding whether to delete everything
//    they own. Letting the request through so this function answers gives a
//    readable 401 instead.
//
//    The checks below are the real ones, and they are stricter than the
//    gateway's: no Authorization header is a 401, a token that does not
//    resolve to a live user is a 401 (which also catches revoked sessions,
//    where a signature check would not), and the id deleted comes from that
//    token rather than from anything the caller sent.
// ─────────────────────────────────────────────────────────────────────────
import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Echoes back whatever the browser asked to send. See note 1 above. */
function cors(req: Request): Record<string, string> {
  const asked = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      asked ?? 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    // Saves a round trip on every retry; the answer never varies.
    'Access-Control-Max-Age': '86400',
  }
}

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(req) })
  }
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json(req, { error: 'Not signed in' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) {
    return json(req, { error: 'Server is misconfigured' }, 500)
  }

  // Resolve who is asking from their token, not from anything they sent.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data, error } = await caller.auth.getUser()
  if (error || !data.user) return json(req, { error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceRoleKey)
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json(req, { error: deleteError.message }, 500)

  return json(req, { deleted: true }, 200)
})
