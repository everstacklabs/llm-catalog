# Model Catalog Dashboard

A Vite + React Router dashboard that browses the model catalog defined in `../providers/`. Inspired by portkey.ai/models.

## Routes

- `/` — All models with provider, capability, modality, and status filters
- `/:provider` — Provider overview, models, configuration, and templates
- `/:provider/:model` — Detailed model page with pricing, capabilities, and usage example

## Develop

```bash
cd web
npm install
npm run dev
```

The `dev` and `build` scripts run `scripts/build-catalog.mjs` first, which walks `../providers/` and writes `public/catalog.json` for the frontend to fetch at runtime. Re-run `npm run build-catalog` whenever the YAML sources change.

## Build

```bash
npm run build
npm run preview
```
