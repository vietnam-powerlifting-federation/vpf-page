# Config fails fast on env

[lib/config/config.ts](../lib/config/config.ts) is not a lazy accessor: it validates on **module import** and throws. A missing variable therefore kills the dev server, the build, or the entire Vitest run at startup with a confusing stack trace rather than failing at the point of use. When something dies immediately on boot, check the environment first.

## Hard requirements

- `JWT_SECRET` — always.
- **All five** Cloudflare R2 variables (`CLOUDFLARE_R2_ACCOUNT_ID`, `_ACCESS_KEY_ID`, `_SECRET_ACCESS_KEY`, `_VIP_BUCKET`, `_VIP_PUBLIC_URL_BASE`) — unconditionally, even for work that never touches image upload.
- `SMTP_PASSWORD` and `SMTP_FROM` — **unless** `EMAIL_VERIFICATION_SKIP=true`, the local-development escape hatch. That flag also marks new registrations verified immediately and sends no email, so it must never be set in production.
- `TEST_DATABASE_URL` — required whenever `VITEST` is set. The config swaps `databaseURL` to it automatically, which is why tests hit the test database without any extra wiring.

## Defaults

`LOG_LEVEL=info`, `JWT_EXPIRES_IN=30d`, `NODE_ENV=development`. The VietQR variables default to empty strings and silently produce a broken QR URL rather than throwing — worth remembering when a payment QR renders blank.

## Logging

Winston, configured in [lib/logger/logger.ts](../lib/logger/logger.ts), writing to `logs/`. Handlers log with `logger.info` / `warn` / `error` / `debug` and structured metadata; never `console.log`.
