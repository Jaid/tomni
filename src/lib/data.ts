import type {ModelAssetFiles} from './modelAssets.ts'
import type {ModelId} from './models.ts'

import {Unpackr} from 'msgpackr/unpack'

import {decodeBase85} from './base85Decode.ts'
import {modelIds} from './models.ts'

export type ModelAssetMap = Partial<Record<ModelId, ModelAssetFiles>>

type MsgpackUnpackr = {
  unpack: (value: Uint8Array) => unknown
}
type MsgpackUnpackrConstructor = new (options: {mapsAsObjects: boolean}) => MsgpackUnpackr
const UnpackrConstructor = Unpackr as unknown as MsgpackUnpackrConstructor
const unpackr = new UnpackrConstructor({
  mapsAsObjects: false,
})
const textDecoder = new TextDecoder
const modelAssetMap = Object.create(null) as ModelAssetMap
const binaryCache = new Map<string, Uint8Array>
const msgpackCache = new Map<string, unknown>
const textCache = new Map<string, string>
const getModelFileKey = (modelId: ModelId, fileName: string) => {
  return `${modelId}/${fileName}`
}
const clearModelCaches = (modelId: ModelId) => {
  const cacheKeyPrefix = `${modelId}/`
  for (const cacheKey of binaryCache.keys()) {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      binaryCache.delete(cacheKey)
    }
  }
  for (const cacheKey of textCache.keys()) {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      textCache.delete(cacheKey)
    }
  }
  for (const cacheKey of msgpackCache.keys()) {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      msgpackCache.delete(cacheKey)
    }
  }
}
const getModelFiles = (modelId: ModelId) => {
  const files = modelAssetMap[modelId]
  if (!files) {
    throw new Error(`Missing tokenizer assets for model ${JSON.stringify(modelId)}. Run “bun run fetch” first or load the vocabulary chunk before tokenizing.`)
  }
  return files
}
const getEncodedModelFile = (modelId: ModelId, fileName: string) => {
  const file = getModelFiles(modelId)[fileName]
  if (!file) {
    throw new Error(`Missing tokenizer asset ${JSON.stringify(fileName)} for model ${JSON.stringify(modelId)}. Run “bun run fetch” first.`)
  }
  return file
}
const getModelFileBytes = (modelId: ModelId, fileName: string) => {
  const cacheKey = getModelFileKey(modelId, fileName)
  const cached = binaryCache.get(cacheKey)
  if (cached) {
    return cached
  }
  const file = getEncodedModelFile(modelId, fileName)
  if (file instanceof Uint8Array) {
    binaryCache.set(cacheKey, file)
    return file
  }
  const decoded = decodeBase85(file)
  binaryCache.set(cacheKey, decoded)
  return decoded
}
const toMsgpackFileName = (fileName: string) => {
  if (fileName.endsWith('.msgpack')) {
    return fileName
  }
  if (fileName.endsWith('.json')) {
    return `${fileName.slice(0, -'.json'.length)}.msgpack`
  }
  throw new TypeError(`Expected a MessagePack or JSON file name, got ${JSON.stringify(fileName)}.`)
}

export const hasModelAssets = (modelId: ModelId) => {
  return Object.hasOwn(modelAssetMap, modelId)
}

export const registerModelAssets = (modelId: ModelId, files: ModelAssetFiles) => {
  modelAssetMap[modelId] = files
  clearModelCaches(modelId)
}

export const registerModelAssetMap = (assets: ModelAssetMap) => {
  for (const modelId of modelIds) {
    const files = assets[modelId]
    if (!files) {
      continue
    }
    registerModelAssets(modelId, files)
  }
}

export const readModelTextFile = (modelId: ModelId, fileName: string) => {
  if (fileName.endsWith('.json') || fileName.endsWith('.msgpack')) {
    throw new TypeError(`Cannot read structured tokenizer asset ${JSON.stringify(fileName)} as text.`)
  }
  const cacheKey = getModelFileKey(modelId, fileName)
  const cached = textCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }
  const text = textDecoder.decode(getModelFileBytes(modelId, fileName))
  textCache.set(cacheKey, text)
  return text
}

export const readModelMsgpackFile = <T>(modelId: ModelId, fileName: string): T => {
  const normalizedFileName = toMsgpackFileName(fileName)
  const cacheKey = getModelFileKey(modelId, normalizedFileName)
  const cached = msgpackCache.get(cacheKey)
  if (cached !== undefined) {
    return cached as T
  }
  const unpacked = unpackr.unpack(getModelFileBytes(modelId, normalizedFileName)) as T
  msgpackCache.set(cacheKey, unpacked)
  return unpacked
}

export const getAvailableModelIds = () => {
  return modelIds.filter(modelId => hasModelAssets(modelId))
}
