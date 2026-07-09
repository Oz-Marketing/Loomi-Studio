# Runbook: rotate the prod DB password (and the traps that bite)

Rotating `doadmin` on the managed Postgres cluster (`loomi-prod`) is a ~3-minute
job **if** you avoid the six traps below. We hit every one of them on 2026-06-20;
this is the calm version.

## Access first (you can't SSH in normally)

Only the GitHub deploy key is in the droplet's `authorized_keys`, so
`ssh root@<DO_HOST>` from your laptop fails with `Permission denied (publickey)`.
Use the **DO web console**: Dashboard → the Droplet → **Console** (or Access →
Launch Droplet Console) → root shell in the browser.

> **Trap 0 — no break-glass SSH.** While you're in the console, add your laptop's
> public key so you have real emergency access next time:
> ```bash
> echo "ssh-ed25519 AAAA...your-laptop-pubkey..." >> /root/.ssh/authorized_keys
> ```

## The rotation

**Order matters — get the console open BEFORE resetting, or prod is down until you
finish.**

1. **Reset** `doadmin` in DO → Users & Databases → reset password → copy the new value.
2. In the root console, edit the env:
   ```bash
   nano /var/www/loomi-studio/shared/.env.local
   ```
   Change **only** the password between `doadmin:` and `@` on the `DATABASE_URL`
   line. Leave host/port/db/sslmode alone.

   > **Trap 1 — doubled prefix.** The value is *just the URL*. Don't paste
   > `DATABASE_URL=` inside the quotes — `DATABASE_URL='DATABASE_URL=postgres://…'`
   > makes the value start with `DATABASE_URL=`, and the app throws
   > `DATABASE_URL must be a PostgreSQL URL`. Correct line:
   > ```
   > DATABASE_URL='postgresql://doadmin:NEWPASS@loomi-prod-…:25060/defaultdb?sslmode=require&uselibpqcompat=true'
   > ```

   > **Trap 2 — SSL mode.** Plain `?sslmode=require` **breaks the app/worker**:
   > current `pg` treats `require` as `verify-full`, and DO's cert is
   > self-signed in its chain → `SELF_SIGNED_CERT_IN_CHAIN`. But `sslmode=no-verify`
   > breaks the *deploy* (`prisma db push`/`migrate deploy` use Prisma's own driver,
   > which doesn't accept it). The value that satisfies **both** is:
   > ```
   > ?sslmode=require&uselibpqcompat=true
   > ```
   > node-postgres reads `uselibpqcompat` (TLS, no strict chain check); Prisma reads
   > plain `require`.

3. Reload + restart. **A plain `pm2 restart` is not enough.**
   ```bash
   set -a; . /var/www/loomi-studio/shared/.env.local; set +a
   pm2 restart all --update-env
   ```

   > **Trap 3 — PM2 caches env.** PM2 keeps the environment from the process's
   > original launch, and dotenv won't override an already-set var (you'll see
   > `[dotenv] injecting env (0)`). So you must **source the file into the shell**
   > (`set -a; . file; set +a`) **and** restart with `--update-env`. Without both,
   > the app keeps using the OLD password and fails auth (`28P01`).

4. Verify (no flood):
   ```bash
   pm2 logs loomi-studio-worker --lines 12 --nostream   # want: "pg-boss started"
   pm2 list                                              # ↺ steady, uptime growing
   ```
   Then load the site and hit a data-backed page.

## After

- **Trap 4 — temp firewall rule.** If you allowlisted your laptop IP in
  `loomi-prod` → Network Access to run migrations, remove it when done.
- **Trap 5 — secret in chat/logs.** `grep DATABASE_URL …` prints the password.
  Don't paste it into assistants or tickets; redact. (We leaked it twice doing
  this — see below.)

## Do this so rotation stops being scary

- **Stop using `doadmin` for the app.** Create a dedicated least-privilege app
  user (DO → Users & Databases → add user, grant only what the app needs).
  Rotating *that* never risks cluster-admin and is lower stakes. Put its URL in
  `shared/.env.local`; keep `doadmin` for admin tasks only.
- **Harden SSL properly later:** download DO's CA cert and use
  `sslmode=verify-full&sslrootcert=/path/ca.crt` (verify both Prisma CLI and
  node-postgres accept it) instead of `uselibpqcompat`.
- The droplet's `shared/.env.local` is the source of truth and is **not**
  overwritten by deploys, so these values persist across releases.
