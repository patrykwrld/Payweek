# Auth email templates

Supabase has no API for these — they are pasted into the dashboard by hand. So
the files here are the source of truth, and the dashboard is a copy. If you
edit one, edit it **here first**, then paste.

## Installing

Supabase → **Authentication → Emails → Templates**.

| Template | File | Subject line to set |
| --- | --- | --- |
| Confirm signup | `confirm-signup.html` | `Confirm your email address` |

Paste the whole file into the message body box, set the subject, **Save**.

## Check it once, properly

The template can only really be tested by receiving one. Register a throwaway
account at payweek.app and look at what arrives:

1. **The greeting says your username**, not `<no value>` and not a blank line.
   That is the one part of this that depends on Supabase's template engine
   rather than on HTML — see the note below.
2. **The button opens the app**, not a browser error.
3. **It doesn't scroll sideways** on the phone.
4. It **didn't land in spam**. If it did, that is deliverability, not the
   template — see `docs/LAUNCH_DAY.md` Step 3b.

## The username greeting

`signUpWithPassword` puts the username into `raw_user_meta_data`, so the
template can read it as `{{ .Data.username }}`. It is wrapped in
`{{ if .Data.username }}` because accounts created before usernames existed
have none, and an unguarded reference prints `<no value>` into somebody's
inbox.

**If the conditional isn't accepted by your project**, delete the three lines
it wraps. The email reads perfectly well without a greeting, and nothing else
depends on it.

## Why the HTML looks like 2004

Because email clients are. Every oddity in the file is deliberate:

| Choice | Reason |
| --- | --- |
| Tables, not divs | Outlook renders with the Word engine — no flexbox, no grid |
| Inline styles | Gmail strips `<style>` when a message is forwarded or clipped |
| `bgcolor` **and** `background-color` | Outlook honours the attribute where it ignores the CSS |
| No images at all | Nothing to be blocked by default, no broken-image boxes, better spam score |
| Dark by design, not by media query | A dark email survives Gmail's dark-mode transform; a light one gets inverted into something nobody chose |
| Fluid table, MSO-only fixed wrapper | `width="600"` beats `max-width`, and a phone then scrolls sideways. Verified at 375px |
| `word-break: break-all` on the URL | Auth URLs are long enough to push the whole email sideways without it |
| Hidden preheader block | Otherwise the inbox preview is the first words of the body |

## Not done yet

The other templates are still Supabase's defaults. They share this one's shell,
so each is a copy with the middle swapped:

- **Reset password** — the one that matters next, since it is the only other
  email a real user sees
- Magic link — unused; sign-in is username and password
- Change email address, Reauthentication — not reachable in the app today
