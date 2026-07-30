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
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = req.headers.get('Authorization')
  if (!authorization) return json({ error: 'Not signed in' }, 401)

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !anonKey || !serviceRoleKey) {
    return json({ error: 'Server is misconfigured' }, 500)
  }

  // Resolve who is asking from their token, not from anything they sent.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data, error } = await caller.auth.getUser()
  if (error || !data.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceRoleKey)
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id)
  if (deleteError) return json({ error: deleteError.message }, 500)

  return json({ deleted: true }, 200)
})
