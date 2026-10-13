# Friends Demon List

A private, invite-only Geometry Dash community ranking built with Next.js + Supabase and deployable on Vercel.

## Features in this starter

- Invite-only accounts (no public sign-up form).
- Shared community ranking with difficulty categories and admin-only reordering.
- Members submit completions; proof URL is optional.
- Submissions are pending until an admin approves/rejects them.
- Approved completions appear in the shared ranking and records tab.
- Supabase Row Level Security protects the tables even if someone edits browser code.
- Responsive dark, minimalist competitive UI.

## 1. Create a Supabase project

1. Create a project at https://supabase.com/.
2. Open **SQL Editor → New query**.
3. Paste and run `supabase/schema.sql` from this repository.
4. In **Project Settings → API**, copy the Project URL and the publishable/anon key. The publishable/anon key is intended for browser use; never use a `service_role` or secret key in frontend code.

## 2. Configure invite-only authentication

1. In Supabase, open **Authentication → Sign In / Providers** (the exact menu label may vary) and turn off public sign-ups if the project exposes that setting. Do not add a public sign-up page to this app.
2. Open **Authentication → URL Configuration**. Set the Site URL to your deployed Vercel URL once you have it. During local development, allow `http://localhost:3000/**`; after deployment, allow `https://YOUR-APP.vercel.app/**` and the callback `https://YOUR-APP.vercel.app/auth/callback`.
3. Invite each friend from **Authentication → Users → Invite user**. They should use the invite email to finish setting up the account. If your project uses a password recovery/set-password flow, configure the Supabase email template to redirect to `/auth/callback` and test the invite flow before sharing the site.
4. The SQL trigger creates a `member` profile automatically when a new auth user is created.
5. In the Supabase invite email template, make the invite redirect to your app callback with `?next=/set-password` (for example, use the allowed redirect URL `https://YOUR-APP.vercel.app/auth/callback?next=/set-password`). After accepting the invite, the friend can set a password on this app. Test this flow before inviting the whole group.

### Make your own account an admin

After you have signed in once and your profile exists, run this in the SQL Editor, replacing the email with your own account email:

```sql
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('YOUR_EMAIL@example.com');
```

Run that only for people you trust. Admins can edit the ranking and approve or reject submitted records.

## 3. Run locally

Install Node.js 20 or newer, then in the project folder:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase URL and publishable/anon key. Do not put secret keys in variables prefixed with `NEXT_PUBLIC_`.

Then run:

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with an invited account.

## 4. Deploy to Vercel

1. Create a GitHub repository and upload these project files. Do not upload `.env.local`.
2. In https://vercel.com/, import that repository.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in **Project → Settings → Environment Variables** for Production (and Preview if wanted).
4. Deploy.
5. Copy the Vercel URL into Supabase **Authentication → URL Configuration → Site URL** and add the deployed URL and `/auth/callback` to allowed redirect URLs.
6. Test login, record submission, admin approval, and ranking reorder using a normal member account and an admin account.

## 5. Suggested operating rules

- Use a proof link to a YouTube/Twitch clip or screenshot when available; proof is optional by design.
- A submission is not a confirmed record until an admin approves it.
- Only admins can add levels, reorder positions, and moderate records.
- Export/backup the Supabase database periodically.

## Notes / limitations

- This is a functional starter, not an officially affiliated Geometry Dash product.
- Starter levels are examples and positions 1–4 are placeholders for your own community ranking, not claims about official Demon List ranks. Remove or replace them in Supabase.
- The starter prevents duplicate completion submissions for the same user and level. If you want records with multiple attempts or separate 100%/verified status later, the schema can be extended.
- Supabase email delivery and invite links depend on your project's Auth/email configuration. Test invitations with your own account first.
