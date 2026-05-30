import type {ModelDefinition, ModelId} from '#src/lib/models.ts'

import path from 'node:path'
import {brotliCompressSync, constants as zlibConstants} from 'node:zlib'

import fs from 'fs-extra'
import {pack} from 'msgpackr/pack'

import {modelIds, models} from '#src/lib/models.ts'

const dataFolder = path.resolve(import.meta.dirname, '../temp/data')
const generatedModelAssetsFolder = path.resolve(import.meta.dirname, '../temp/generated/model-assets')

type JsonPrimitive = boolean | number | string | null
type JsonArray = Array<JsonValue>
type JsonObject = {[key: string]: JsonValue}
type JsonValue = JsonArray | JsonObject | JsonPrimitive

type MessagePackPack = (value: unknown) => Uint8Array
type BuiltinTiktokenModelDefinition = Extract<ModelDefinition, {kind: 'tiktoken-builtin'}>
type CustomTiktokenModelDefinition = Extract<ModelDefinition, {kind: 'tiktoken-custom'}>
type HuggingFaceModelDefinition = Extract<ModelDefinition, {kind: 'huggingface'}>
type ClipBpeModelDefinition = Extract<ModelDefinition, {kind: 'clip-bpe'}>

const packMessagePack = pack as unknown as MessagePackPack
const isJsonObject = (value: unknown): value is JsonObject => {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
const getJsonEntries = (value: JsonObject) => {
  return Object.entries(value)
}
const ensureFolder = async (folder: string) => {
  await fs.mkdir(folder, {recursive: true})
}
const fetchResponse = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${JSON.stringify(url)}: ${response.status} ${response.statusText}`)
  }
  return response
}
const fetchJson = async (url: string): Promise<JsonValue> => {
  const response = await fetchResponse(url)
  return await response.json() as JsonValue
}
const fetchText = async (url: string) => {
  const response = await fetchResponse(url)
  return response.text()
}
const writeBinaryFile = async (filePath: string, content: Uint8Array) => {
  await ensureFolder(path.dirname(filePath))
  await fs.writeFile(filePath, content)
}
const writeTextFile = async (filePath: string, content: string) => {
  await ensureFolder(path.dirname(filePath))
  await fs.writeFile(filePath, content)
}
const toMessagePackValue = (value: JsonValue): unknown => {
  if (Array.isArray(value)) {
    return value.map(entry => toMessagePackValue(entry))
  }
  if (isJsonObject(value)) {
    return new Map(getJsonEntries(value).map(([key, entryValue]) => [key, toMessagePackValue(entryValue)]))
  }
  return value
}
const writeMessagePackFile = async (filePath: string, value: JsonValue) => {
  await writeBinaryFile(filePath, packMessagePack(toMessagePackValue(value)))
}
const extractKimiPattern = (tokenizerImplementation: string) => {
  const match = /pat_str\s*=\s*"\|"\.join\(\[(?<body>[\s\S]*?)\]\)/u.exec(tokenizerImplementation)
  if (!match?.groups?.body) {
    throw new Error('Could not extract Kimi pat_str from tokenization_kimi.py.')
  }
  const parts = [...match.groups.body.matchAll(/r"""([\s\S]*?)"""/gu)].map(([, part]) => part)
  if (!parts.length) {
    throw new Error('Could not parse Kimi pat_str fragments from tokenization_kimi.py.')
  }
  return parts.join('|')
}
const getSpecialTokensFromTokenizerConfig = (tokenizerConfig: JsonObject) => {
  const addedTokensDecoder = tokenizerConfig.added_tokens_decoder
  if (!isJsonObject(addedTokensDecoder)) {
    throw new Error('Kimi tokenizer_config.json does not expose added_tokens_decoder.')
  }
  const specialTokens: Record<string, number> = {}
  for (const [tokenId, data] of getJsonEntries(addedTokensDecoder)) {
    if (!isJsonObject(data)) {
      continue
    }
    const content = data.content
    if (!content) {
      continue
    }
    if (typeof content !== 'string') {
      continue
    }
    specialTokens[content] = Number(tokenId)
  }
  return specialTokens
}
const brotliWindowSizes = [22, 23, 24] as const
const compressWithBestBrotliWindow = (content: Uint8Array) => {
  let bestCompressedContent: Uint8Array | undefined
  let bestWindowSize = Number.POSITIVE_INFINITY
  for (const windowSize of brotliWindowSizes) {
    const compressedContent = brotliCompressSync(content, {
      params: {
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_GENERIC,
        [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
        [zlibConstants.BROTLI_PARAM_LGWIN]: windowSize,
      },
    })
    if (!bestCompressedContent || compressedContent.byteLength < bestCompressedContent.byteLength || compressedContent.byteLength === bestCompressedContent.byteLength && windowSize < bestWindowSize) {
      bestCompressedContent = compressedContent
      bestWindowSize = windowSize
    }
  }
  if (!bestCompressedContent) {
    throw new Error('Could not produce a Brotli-compressed tokenizer asset bundle.')
  }
  return bestCompressedContent
}
const getBundledModelFileNames = (model: ModelDefinition) => {
  switch (model.kind) {
    case 'tiktoken-builtin': {
      return ['config.msgpack']
    }
    case 'tiktoken-custom': {
      return ['config.msgpack', 'tiktoken.model']
    }
    case 'huggingface': {
      return ['tokenizer.msgpack', 'tokenizer_config.msgpack']
    }
    case 'clip-bpe': {
      return ['merges.txt', 'tokenizer_config.msgpack', 'vocab.msgpack']
    }
  }
}
const generateModelAssetBundles = async () => {
  await fs.emptyDir(generatedModelAssetsFolder)
  for (const modelId of modelIds) {
    const modelFolder = path.join(dataFolder, modelId)
    const fileNames = getBundledModelFileNames(models[modelId]).toSorted((left, right) => left.localeCompare(right))
    const bundledFiles = new Map(await Promise.all(fileNames.map(async fileName => {
      const filePath = path.join(modelFolder, fileName)
      return [fileName, new Uint8Array(await fs.readFile(filePath))] as const
    })))
    await writeBinaryFile(path.join(generatedModelAssetsFolder, `${modelId}.bin`), compressWithBestBrotliWindow(packMessagePack(bundledFiles)))
  }
}
const fetchBuiltinTiktokenModel = async (modelId: ModelId, model: BuiltinTiktokenModelDefinition) => {
  const {encoding} = model
  const modelFolder = path.join(dataFolder, modelId)
  await ensureFolder(modelFolder)
  await writeMessagePackFile(path.join(modelFolder, 'config.msgpack'), {
    encoding,
  })
}
const fetchCustomTiktokenModel = async (modelId: ModelId, model: CustomTiktokenModelDefinition) => {
  const {source} = model
  const modelFolder = path.join(dataFolder, modelId)
  await ensureFolder(modelFolder)
  const [modelFile, tokenizerConfig, tokenizerImplementation]: [string, JsonValue, string] = await Promise.all([
    fetchText(source.modelUrl),
    fetchJson(source.tokenizerConfigUrl),
    fetchText(source.tokenizerImplementationUrl),
  ])
  if (!isJsonObject(tokenizerConfig)) {
    throw new TypeError('Kimi tokenizer_config.json did not parse into an object.')
  }
  const patStr = extractKimiPattern(tokenizerImplementation)
  const specialTokens = getSpecialTokensFromTokenizerConfig(tokenizerConfig)
  await Promise.all([
    writeMessagePackFile(path.join(modelFolder, 'config.msgpack'), {
      pat_str: patStr,
      special_tokens: specialTokens,
    }),
    writeTextFile(path.join(modelFolder, 'tiktoken.model'), modelFile),
  ])
}
const fetchHuggingFaceModel = async (modelId: ModelId, model: HuggingFaceModelDefinition) => {
  const {source} = model
  const modelFolder = path.join(dataFolder, modelId)
  await ensureFolder(modelFolder)
  const [tokenizer, tokenizerConfig]: [JsonValue, JsonValue] = await Promise.all([
    fetchJson(source.tokenizerJsonUrl),
    fetchJson(source.tokenizerConfigUrl),
  ])
  await Promise.all([
    writeMessagePackFile(path.join(modelFolder, 'tokenizer.msgpack'), tokenizer),
    writeMessagePackFile(path.join(modelFolder, 'tokenizer_config.msgpack'), tokenizerConfig),
  ])
}
const fetchClipBpeModel = async (modelId: ModelId, model: ClipBpeModelDefinition) => {
  const {source} = model
  const modelFolder = path.join(dataFolder, modelId)
  await ensureFolder(modelFolder)
  const [vocabulary, merges, tokenizerConfig]: [JsonValue, string, JsonValue] = await Promise.all([
    fetchJson(source.vocabUrl),
    fetchText(source.mergesUrl),
    fetchJson(source.tokenizerConfigUrl),
  ])
  await Promise.all([
    writeMessagePackFile(path.join(modelFolder, 'vocab.msgpack'), vocabulary),
    writeTextFile(path.join(modelFolder, 'merges.txt'), merges),
    writeMessagePackFile(path.join(modelFolder, 'tokenizer_config.msgpack'), tokenizerConfig),
  ])
}
const fetchModel = async (modelId: typeof modelIds[number]) => {
  const model = models[modelId]
  switch (model.kind) {
    case 'tiktoken-builtin': {
      await fetchBuiltinTiktokenModel(modelId, model)
      return
    }
    case 'tiktoken-custom': {
      await fetchCustomTiktokenModel(modelId, model)
      return
    }
    case 'huggingface': {
      await fetchHuggingFaceModel(modelId, model)
      return
    }
    case 'clip-bpe': {
      await fetchClipBpeModel(modelId, model)
    }
  }
}
console.log(`Writing tokenizer assets to ${dataFolder}`)
await fs.emptyDir(dataFolder)
for (const modelId of modelIds) {
  console.log(`• ${modelId}`)
  await fetchModel(modelId)
}
console.log(`Generating bundled tokenizer assets in ${generatedModelAssetsFolder}`)
await generateModelAssetBundles()
console.log('Done.')
