// Signs someone in with a username and password.
//
// Supabase authenticates on email. The username is a handle stored in
// public.profiles, so signing in with one means looking up the address it
// belongs to — and that lookup is exactly what must not be exposed to the
// client. A public "what email does this username use" endpoint would turn a
// list of usernames into a list of email addresses.
//
// So the whole exchange happens here: the service role resolves the address,
// this function performs the password sign-in, and only the resulting session
// goes back. The caller learns nothing it did not already know.
//
// Every failure returns the same message. A wrong username and a wrong
// password must be indistinguishable, or this becomes a way to find out who
// has an account.
//
// See delete-account/index.ts for why the CORS headers are echoed and why
// this deploys with verify_jwt = false. Both apply here for the same reasons,
// and this one additionally *cannot* require a JWT: nobody signing in has one
// yet.
import { createClient } from 'jsr:@supabase/supabase-js@2'

function cors(req: Request): Record<string, string> {
  const asked = req.headers.get('Access-Control-Request-Headers')
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      asked ?? 'authorization, content-type, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

function json(req: Request, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json' },
  })
}

/** One message for every way this can fail. */
const WRONG = 'That username and password don’t match an account.'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(req) })
  }
  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, 405)
  }

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) {
    return json(req, { error: 'Server is misconfigured' }, 500)
  }

  let username = ''
  let password = ''
  try {
    const body = (await req.json()) as { username?: unknown; password?: unknown }
    username = typeof body.username === 'string' ? body.username.trim() : ''
    password = typeof body.password === 'string' ? body.password : ''
  } catch {
    return json(req, { error: WRONG }, 400)
  }
  if (username === '' || password === '') {
    return json(req, { error: WRONG }, 400)
  }
  // Nothing outside the allowed shape can be a real username, so it is not
  // worth a database round trip.
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return json(req, { error: WRONG }, 400)
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle()

  if (!profile) return json(req, { error: WRONG }, 401)

  const { data: found, error: lookupError } =
    await admin.auth.admin.getUserById(profile.id)
  const email = found?.user?.email
  if (lookupError || !email) return json(req, { error: WRONG }, 401)

  // A fresh anon client, so the sign-in is subject to the same auth rate
  // limits and password checks as one done from the app directly.
  const caller = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn, error: signInError } =
    await caller.auth.signInWithPassword({ email, password })

  if (signInError || !signIn.session) {
    // "Email not confirmed" is worth passing on — it is the one failure the
    // person can do something about, and it gives nothing away that they
    // didn't just prove they knew.
    const detail = signInError?.message ?? ''
    if (/confirm/i.test(detail)) {
      return json(
        req,
        { error: 'Confirm your email address first — check your inbox.' },
        401,
      )
    }
    return json(req, { error: WRONG }, 401)
  }

  return json(
    req,
    {
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
    },
    200,
  )
})
