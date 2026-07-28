# Updating the Model Catalog

The hierarchical files under `model-catalog/providers/` are the source of
truth. Do not edit the generated embedded `models.yaml` or `providers.yaml`
files by hand.

## Add or update models

1. Edit the relevant files under
   `model-catalog/providers/<provider>/models/`.
2. Include an ISO `release_date` so provider sheets can sort newest-first.
3. Keep model IDs compatible with the provider adapter. Meta-providers may
   keep a curated static fallback when their full inventory is discovered at
   runtime.
4. Add a structured entry to `model-catalog/changelog.yaml`.
5. Bump `model-catalog/version.txt`:
   - minor for new models or providers;
   - patch for metadata, pricing, or status corrections.

For a catalog-wide refresh from the same models.dev source used by the current
catalog, review the allowlist and run:

```bash
# Dry run
node model-catalog/scripts/sync-models-dev.mjs --source /path/to/api.json

# Apply reviewed additions and release-date backfills
node model-catalog/scripts/sync-models-dev.mjs \
  --source /path/to/api.json \
  --write
```

## Regenerate artifacts

Run both generators from the repository root:

```bash
model-catalog/scripts/generate-manifest.sh
go run model-catalog/scripts/generate-embedded-defaults.go
```

The manifest drives remote sync. The embedded defaults keep offline and
pre-sync gateway behavior aligned with the same catalog.

## Verify

At minimum:

```bash
go test ./cmd/config/gateway/validator \
  ./internal/services/provider_catalog \
  ./internal/services/catalog_sync \
  ./internal/api/grpc/catalog/v1 \
  ./internal/api/grpc/providers/v1
```

Also verify that:

- `manifest.yaml` matches `version.txt`;
- manifest model counts match the files on disk;
- the newest dated models appear first in the provider API;
- `changelog.yaml` contains every model intended to receive a “new” marker.

Production gateways sync from:

```text
https://raw.githubusercontent.com/everstacklabs/llm-catalog/main
```
