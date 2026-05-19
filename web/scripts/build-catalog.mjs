#!/usr/bin/env node
// Walks ../providers/** and compiles every YAML file into a single
// catalog.json that the frontend can fetch.

import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const PROVIDERS_DIR = join(ROOT, "providers");
const OUT_DIR = join(__dirname, "..", "public");
const OUT_FILE = join(OUT_DIR, "catalog.json");

function readYaml(path) {
  return yaml.load(readFileSync(path, "utf8"));
}

function safeReadYaml(path) {
  try {
    return readYaml(path);
  } catch {
    return null;
  }
}

function listDirs(path) {
  return readdirSync(path).filter((f) => {
    try {
      return statSync(join(path, f)).isDirectory();
    } catch {
      return false;
    }
  });
}

function listYamlFiles(path) {
  try {
    return readdirSync(path).filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"));
  } catch {
    return [];
  }
}

const version = (() => {
  try {
    return readFileSync(join(ROOT, "version.txt"), "utf8").trim();
  } catch {
    return "unknown";
  }
})();

const providers = [];
let totalModels = 0;

for (const providerName of listDirs(PROVIDERS_DIR).sort()) {
  const providerDir = join(PROVIDERS_DIR, providerName);
  const provider = safeReadYaml(join(providerDir, "provider.yaml")) || { name: providerName };
  const categories = safeReadYaml(join(providerDir, "categories.yaml")) || {};
  const templates = safeReadYaml(join(providerDir, "templates.yaml")) || {};

  const modelsDir = join(providerDir, "models");
  const models = [];
  for (const file of listYamlFiles(modelsDir).sort()) {
    const data = safeReadYaml(join(modelsDir, file));
    if (!data) continue;
    const slug = file.replace(/\.ya?ml$/, "");
    models.push({
      slug,
      provider: providerName,
      ...data,
    });
  }
  totalModels += models.length;

  providers.push({
    slug: providerName,
    ...provider,
    categories,
    templates,
    models,
  });
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  OUT_FILE,
  JSON.stringify(
    {
      version,
      generated_at: new Date().toISOString(),
      total_providers: providers.length,
      total_models: totalModels,
      providers,
    },
    null,
    2,
  ),
);

console.log(`Wrote ${OUT_FILE}: ${providers.length} providers, ${totalModels} models`);
