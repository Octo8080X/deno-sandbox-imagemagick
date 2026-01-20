# ImageConvert by ImageMagick on Deno Sandbox

An image conversion app that runs ImageMagick safely inside Deno Deploy Sandbox.

## Environment

Create a `.env` at the project root before setup. Minimum required values:

```
# dev uses in-memory KV; prod uses persistent KV
APP_ENV=dev

# required for CORS/CSRF allowlist
APP_ORIGIN=http://localhost:8000
```

## Setup

Install dependencies and prepare the sandbox:

```bash
deno task setup
```

## Run

Start the app:

```bash
deno task dev
```

The app middleware auto-starts a Deno Deploy Sandbox for ImageMagick, caches its public URL/passphrase in Deno KV, and forwards `/api/convert` requests through that sandbox.