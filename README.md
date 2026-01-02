# ImageConvert by imagemagick on Deno Sandbox

A memo application that uses Deno Sandbox to run imagemagick commands securely.

## Environment

Create a `.env` at the project root before setup. Minimum required values:

```
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