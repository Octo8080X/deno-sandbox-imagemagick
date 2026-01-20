# ImageConvert by imagemagick on Deno Sandbox

A memo application that uses Deno Sandbox to run imagemagick commands securely.

## Environment

Create a `.env` at the project root before setup. Minimum required values:

```
# dev uses in-memory KV; prod uses persistent KV
APP_ENV=dev

# optional: path to your repo base (if used by your workflow)
SANDBOX_GIT_BASE=<absolute path to the working repo dir>
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