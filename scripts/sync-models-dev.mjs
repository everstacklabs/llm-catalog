#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SOURCE_URL = 'https://models.dev/api.json'
const AUDITED_AFTER = '2026-05-09'

const sourceProviders = {
  anthropic: 'anthropic',
  'aws-bedrock': 'amazon-bedrock',
  'azure-openai': 'azure',
  cerebras: 'cerebras',
  cohere: 'cohere',
  deepseek: 'deepseek',
  fireworks: 'fireworks-ai',
  google: 'google',
  groq: 'groq',
  huggingface: 'huggingface',
  minimax: 'minimax',
  mistral: 'mistral',
  moonshot: 'moonshotai',
  'nvidia-nim': 'nvidia',
  openai: 'openai',
  openrouter: 'openrouter',
  perplexity: 'perplexity',
  qwen: 'alibaba',
  together: 'togetherai',
  'vertex-ai': 'google-vertex',
  xai: 'xai',
}

// Provider-compatible text-generation additions since the last full catalog
// audit. Meta-provider lists intentionally remain flagship fallbacks because
// their complete inventories are discovered at runtime.
const additions = {
  anthropic: [
    'claude-opus-4-8',
    'claude-fable-5',
    'claude-sonnet-5',
    'claude-opus-5',
  ],
  'aws-bedrock': [
    'anthropic.claude-opus-4-8',
    'anthropic.claude-fable-5',
    'anthropic.claude-sonnet-5',
    'anthropic.claude-opus-5',
  ],
  'azure-openai': [
    'gpt-5.6-luna',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
  ],
  cohere: [
    'command-a-plus-05-2026',
    'north-mini-code-1-0',
  ],
  fireworks: [
    'accounts/fireworks/models/glm-5p2',
    'accounts/fireworks/routers/glm-5p2-fast',
    'accounts/fireworks/models/kimi-k2p7-code',
    'accounts/fireworks/routers/kimi-k2p7-code-fast',
    'accounts/fireworks/models/minimax-m3',
    'accounts/fireworks/models/qwen3p7-plus',
  ],
  google: [
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
  ],
  huggingface: [
    'zai-org/GLM-5.2',
    'moonshotai/Kimi-K2.7-Code',
    'MiniMaxAI/MiniMax-M3',
    'stepfun-ai/Step-3.7-Flash',
  ],
  minimax: [
    'MiniMax-M3',
  ],
  moonshot: [
    'kimi-k2.7-code',
    'kimi-k2.7-code-highspeed',
    'kimi-k3',
  ],
  'nvidia-nim': [
    'z-ai/glm-5.2',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'minimaxai/minimax-m3',
    'stepfun-ai/step-3.7-flash',
  ],
  openai: [
    'gpt-realtime-2.1',
    'gpt-5.6',
    'gpt-5.6-luna',
    'gpt-5.6-sol',
    'gpt-5.6-terra',
  ],
  openrouter: [
    'anthropic/claude-opus-4.8',
    'anthropic/claude-opus-4.8-fast',
    'anthropic/claude-fable-5',
    'anthropic/claude-sonnet-5',
    'anthropic/claude-opus-5',
    'anthropic/claude-opus-5-fast',
    'google/gemini-3.5-flash',
    'google/gemini-3.5-flash-lite',
    'google/gemini-3.6-flash',
    'moonshotai/kimi-k2.7-code',
    'moonshotai/kimi-k3',
    'openai/gpt-5.6-luna',
    'openai/gpt-5.6-luna-pro',
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-sol-pro',
    'openai/gpt-5.6-terra',
    'openai/gpt-5.6-terra-pro',
    'x-ai/grok-4.5',
    'z-ai/glm-5.2',
    'qwen/qwen3.7-max',
    'qwen/qwen3.7-plus',
    'minimax/minimax-m3',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'stepfun/step-3.7-flash',
    'thinkingmachines/inkling',
  ],
  qwen: [
    'qwen3.7-max',
    'qwen3.7-plus',
  ],
  together: [
    'thinkingmachines/Inkling',
    'zai-org/GLM-5.2',
    'moonshotai/Kimi-K2.7-Code',
    'MiniMaxAI/MiniMax-M3',
    'nvidia/nemotron-3-ultra-550b-a55b',
    'Qwen/Qwen3.7-Max',
  ],
  'vertex-ai': [
    'claude-fable-5@default',
    'claude-opus-4-8@default',
    'claude-sonnet-5@default',
    'claude-opus-5@default',
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
  ],
  xai: [
    'grok-4.5',
  ],
}

// Primary-source overrides for provider entries that have shipped but are not
// yet represented in the models.dev provider inventory.
const sourceModelOverrides = {
  'vertex-ai/claude-fable-5@default': {
    sourceProvider: 'anthropic',
    sourceModel: 'claude-fable-5',
    releaseDate: '2026-06-09',
  },
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const catalogDir = path.dirname(scriptDir)
const providersDir = path.join(catalogDir, 'providers')
const args = process.argv.slice(2)
const shouldWrite = args.includes('--write')
const sourceIndex = args.indexOf('--source')
const sourcePath = sourceIndex >= 0 ? args[sourceIndex + 1] : undefined

if (sourceIndex >= 0 && !sourcePath) {
  throw new Error('--source requires a JSON file path')
}

const source = sourcePath
  ? JSON.parse(fs.readFileSync(path.resolve(sourcePath), 'utf8'))
  : await fetch(SOURCE_URL).then((response) => {
      if (!response.ok) {
        throw new Error(`models.dev returned ${response.status}`)
      }
      return response.json()
    })

const added = []
const dated = []

for (const [provider, sourceProvider] of Object.entries(sourceProviders)) {
  const sourceModels = source[sourceProvider]?.models
  if (!sourceModels) {
    throw new Error(`models.dev provider ${sourceProvider} is missing`)
  }

  const modelsDir = path.join(providersDir, provider, 'models')
  fs.mkdirSync(modelsDir, { recursive: true })

  const existing = new Map()
  for (const filename of fs.readdirSync(modelsDir).filter((name) => name.endsWith('.yaml'))) {
    const filePath = path.join(modelsDir, filename)
    const contents = fs.readFileSync(filePath, 'utf8')
    const modelName = readModelName(contents)
    if (modelName) existing.set(modelName, { filePath, contents })
  }

  // Backfill release dates for every existing model that has an exact upstream
  // match. This makes newest-first ordering work beyond only this release.
  for (const [modelName, file] of existing) {
    const releaseDate = getSourceModel(provider, modelName, sourceModels)?.release_date
    if (!releaseDate) continue

    const next = setReleaseDate(file.contents, releaseDate)
    if (next === file.contents) continue
    dated.push(`${provider}/${modelName}`)
    if (shouldWrite) fs.writeFileSync(file.filePath, next)
  }

  for (const modelName of additions[provider] ?? []) {
    if (existing.has(modelName)) continue

    const model = getSourceModel(provider, modelName, sourceModels)
    if (!model) {
      throw new Error(`models.dev model ${sourceProvider}/${modelName} is missing`)
    }
    if (!model.release_date || model.release_date <= AUDITED_AFTER) {
      throw new Error(`${sourceProvider}/${modelName} is not a post-${AUDITED_AFTER} addition`)
    }
    if (!model.modalities?.output?.includes('text')) {
      throw new Error(`${sourceProvider}/${modelName} is not a text-output model`)
    }

    const filePath = path.join(modelsDir, modelFilename(provider, modelName))
    if (fs.existsSync(filePath)) {
      throw new Error(`catalog path collision at ${filePath}`)
    }
    added.push(`${provider}/${modelName}`)
    if (shouldWrite) fs.writeFileSync(filePath, renderModel(provider, modelName, model))
  }
}

console.log(`${shouldWrite ? 'Updated' : 'Would update'} ${dated.length} existing release dates`)
console.log(`${shouldWrite ? 'Added' : 'Would add'} ${added.length} models`)
for (const model of added) console.log(`  ${model}`)

function getSourceModel(provider, modelName, sourceModels) {
  const override = sourceModelOverrides[`${provider}/${modelName}`]
  if (!override) return sourceModels[modelName]

  const model = source[override.sourceProvider]?.models?.[override.sourceModel]
  if (!model) return undefined
  return {
    ...model,
    release_date: override.releaseDate ?? model.release_date,
  }
}

function readModelName(contents) {
  const match = contents.match(/^name:\s*(.+?)\s*$/m)
  if (!match) return undefined
  const value = match[1]
  if (value.startsWith('"')) return JSON.parse(value)
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1)
  return value
}

function setReleaseDate(contents, releaseDate) {
  const line = `release_date: ${quote(releaseDate)}`
  if (/^release_date:/m.test(contents)) {
    return contents.replace(/^release_date:.*$/m, line)
  }
  return contents.replace(/^(status:.*)$/m, `$1\n${line}`)
}

function modelFilename(provider, modelName) {
  let filename = modelName
  if (['fireworks', 'huggingface', 'nvidia-nim', 'together'].includes(provider)) {
    filename = filename.replaceAll('/', '__')
  } else if (provider === 'openrouter') {
    filename = filename.replaceAll('/', '-')
  }
  filename = filename.replaceAll(':', '-')
  return `${filename}.yaml`
}

function renderModel(provider, modelName, model) {
  const capabilities = modelCapabilities(provider, modelName, model)
  const suffix = {
    'aws-bedrock': 'Bedrock',
    'azure-openai': 'Azure',
    fireworks: 'Fireworks',
    huggingface: 'Hugging Face',
    'nvidia-nim': 'NVIDIA NIM',
    openrouter: 'OpenRouter',
    together: 'Together',
    'vertex-ai': 'Vertex',
  }[provider]
  const displayName = suffix ? `${model.name} (${suffix})` : model.name
  const status = /(?:preview|beta|experimental)/i.test(modelName) ? 'preview' : 'stable'
  const lines = [
    `name: ${quote(modelName)}`,
    `display_name: ${quote(displayName)}`,
    `family: ${quote(model.family || modelName)}`,
    `status: ${quote(status)}`,
    `release_date: ${quote(model.release_date)}`,
    '',
    'cost:',
    `  input_per_1k: ${perThousand(model.cost?.input)}`,
    `  output_per_1k: ${perThousand(model.cost?.output)}`,
  ]

  if (typeof model.cost?.cache_read === 'number') {
    lines.push(`  cache_read_per_1k: ${perThousand(model.cost.cache_read)}`)
  }
  if (typeof model.cost?.cache_write === 'number') {
    lines.push(`  cache_write_per_1k: ${perThousand(model.cost.cache_write)}`)
  }

  lines.push(
    '',
    'limits:',
    `  max_tokens: ${model.limit?.context ?? 0}`,
    `  max_completion_tokens: ${model.limit?.output ?? 0}`,
    '',
    'capabilities:',
    ...capabilities.map((capability) => `  - ${capability}`),
    '',
    'modalities:',
    `  input: ${JSON.stringify(model.modalities?.input ?? ['text'])}`,
    `  output: ${JSON.stringify(model.modalities?.output ?? ['text'])}`,
  )

  if (model.knowledge) {
    lines.push('', `knowledge_cutoff: ${quote(model.knowledge)}`)
  }
  if (model.description) {
    lines.push(`notes: ${quote(model.description)}`)
  }

  return `${lines.join('\n')}\n`
}

function modelCapabilities(provider, modelName, model) {
  const capabilities = ['chat']
  if (model.tool_call) capabilities.push('function_calling')
  if (model.modalities?.input?.includes('image')) capabilities.push('vision')
  if (model.reasoning) {
    if (provider === 'anthropic' || (provider === 'aws-bedrock' && modelName.includes('anthropic.'))) {
      capabilities.push('extended_thinking')
    } else {
      capabilities.push('reasoning')
    }
  }
  if (provider === 'anthropic') capabilities.push('computer_use')
  return capabilities
}

function perThousand(perMillion) {
  if (typeof perMillion !== 'number') return 0
  return Number((perMillion / 1000).toPrecision(12))
}

function quote(value) {
  return JSON.stringify(String(value))
}
