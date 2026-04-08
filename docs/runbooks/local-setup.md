# Local Setup

## 1. Install dependencies

```bash
pnpm install
```

## 2. Create local environment file

```bash
cp .env.example .env.local
```

Fill in your Supabase and operational secrets before trying auth or API work.

## 3. Start the public and admin apps

```bash
pnpm dev:web
pnpm dev:admin
```

## 4. Supabase

After installing the Supabase CLI locally:

```bash
supabase start
supabase db reset
```

This applies the migrations in `supabase/migrations/` and the seed file in `supabase/seed/seed.sql`.
