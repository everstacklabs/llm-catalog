# Model Catalog Dashboard

A Vite + React Router dashboard that browses the model catalog defined in `../providers/`. Inspired by portkey.ai/models.

## Routes

- `/` — All models with provider, capability, modality, and status filters
- `/:provider` — Provider overview, models, configuration, and templates
- `/:provider/:model` — Detailed model page with pricing, capabilities, and usage example

## Develop

This project uses [Bun](https://bun.com) for package management and as the script runner.

```bash
cd web
bun install
bun run dev
```

The `dev` and `build` scripts run `scripts/build-catalog.mjs` first, which walks `../providers/` and writes `public/catalog.json` for the frontend to fetch at runtime. Re-run `bun run build-catalog` whenever the YAML sources change.

## Build

```bash
bun run build
bun run preview
```
