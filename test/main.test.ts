import type {ModelId} from '#src/main.ts'

import {expect, test} from 'bun:test'

import tokenize, {count, countLoaded, free, load, modelIds, models, tokenizeLoaded, tokenize as tokenizeNamed} from '#src/main.ts'

const expectedModelIds: Array<ModelId> = ['gpt', 'gemma', 'qwen', 'kimi', 'deepseek', 'mimo', 'sdxl', 'glm', 'minimax', 'hy', 'step']
const sampleText = 'mind goblin'
const expectedTokenIds: Record<ModelId, Array<number>> = {
  gpt: [77_021, 18_778, 4724],
  gemma: [24_447, 218_798],
  qwen: [36_475, 338, 45_491],
  kimi: [66_468, 970, 3145, 259],
  deepseek: [60_514, 807, 3778, 261],
  mimo: [37_724, 342, 47_061],
  sdxl: [2575, 26_223],
  glm: [37_528, 342, 46_771],
  minimax: [68_201, 113_859, 259],
  hy: [67_975, 964, 3371, 245],
  step: [60_514, 807, 3778, 261],
}
const textEncoder = new TextEncoder
const denormalizedSdxlInput = ' MIND\tGoblin '
const normalizedSdxlInput = 'mind goblin'
const invalidUtf8Bytes = Uint8Array.of(0xFF)
const sampleTextBytes = textEncoder.encode(sampleText)
const denormalizedSdxlInputBytes = textEncoder.encode(denormalizedSdxlInput)
const normalizedSdxlInputBytes = textEncoder.encode(normalizedSdxlInput)
const expectedTokenEntries = Object.entries(expectedTokenIds) as Array<[ModelId, Array<number>]>
const getErrorMessage = async (job: () => unknown) => {
  try {
    await job()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
  return ''
}
test('exports the documented models and async default export', () => {
  expect(modelIds).toEqual(expectedModelIds)
  expect(Object.keys(models)).toEqual(modelIds)
  expect(tokenizeNamed).toBe(tokenize)
})
test('loaded-only APIs require explicit preloading and free() unloads them again', async () => {
  free()
  expect(() => tokenizeLoaded(sampleText, 'gpt')).toThrow('Call load() first')
  expect(() => countLoaded(sampleText, 'gpt')).toThrow('Call load() first')
  expect(await load('gpt')).toBe('gpt')
  expect(tokenizeLoaded(sampleText, 'gpt')).toEqual({
    offsets: [4, 8],
    tokens: [77_021, 18_778, 4724],
  })
  expect(countLoaded(sampleText, 'gpt')).toBe(3)
  free('gpt')
  expect(() => tokenizeLoaded(sampleText, 'gpt')).toThrow('Call load() first')
  expect(() => countLoaded(sampleText, 'gpt')).toThrow('Call load() first')
})
test('async tokenize() and count() auto-load and match the golden fixtures for all models', async () => {
  free()
  const broaderText = 'Hello, world! 你好 123'
  for (const [modelId, tokenIds] of expectedTokenEntries) {
    const tokenization = await tokenize(sampleText, modelId)
    expect(tokenization.tokens).toEqual(tokenIds)
    expect(tokenizeLoaded(sampleText, modelId).tokens).toEqual(tokenIds)
    expect(await count(sampleText, modelId)).toBe(tokenIds.length)
    expect(countLoaded(sampleText, modelId)).toBe(tokenIds.length)
    const broaderTokenization = await tokenize(broaderText, modelId)
    expect(await count(broaderText, modelId)).toBe(broaderTokenization.tokens.length)
    expect(await tokenize('', modelId)).toEqual({
      offsets: [],
      tokens: [],
    })
    expect(await count('', modelId)).toBe(0)
  }
}, 30_000)
test('load() preloads specific models and supports single-model plus multi-model selections', async () => {
  free()
  expect(await load('gpt')).toBe('gpt')
  expect(tokenizeLoaded(sampleText, 'gpt').tokens).toEqual(expectedTokenIds.gpt)
  expect(await load(['deepseek', 'sdxl'])).toEqual(['deepseek', 'sdxl'])
  expect(countLoaded(sampleText, {model: 'deepseek'})).toBe(expectedTokenIds.deepseek.length)
  expect(tokenizeLoaded(sampleText, 'sdxl').tokens).toEqual(expectedTokenIds.sdxl)
  free()
  expect(() => tokenizeLoaded(sampleText, 'gpt')).toThrow('Call load() first')
  expect(() => countLoaded(sampleText, 'deepseek')).toThrow('Call load() first')
})
test('supports UTF-8 byte input and rejects invalid UTF-8 in both async and loaded-only APIs', async () => {
  free()
  expect(await count(sampleTextBytes, 'gpt')).toBe(3)
  expect(await tokenize(sampleTextBytes, 'gpt')).toEqual({
    offsets: [4, 8],
    tokens: [77_021, 18_778, 4724],
  })
  expect(tokenizeLoaded(sampleTextBytes, 'gpt')).toEqual({
    offsets: [4, 8],
    tokens: [77_021, 18_778, 4724],
  })
  expect(await getErrorMessage(() => count(invalidUtf8Bytes, 'gpt'))).toContain('valid UTF-8')
  expect(() => countLoaded(invalidUtf8Bytes, 'gpt')).toThrow('valid UTF-8')
  expect(await getErrorMessage(() => tokenize(invalidUtf8Bytes, 'gpt'))).toContain('valid UTF-8')
  expect(() => tokenizeLoaded(invalidUtf8Bytes, 'gpt')).toThrow('valid UTF-8')
})
test('reports normalized CLIP input when preprocessing changes it', async () => {
  free()
  expect(await tokenize(denormalizedSdxlInput, 'sdxl')).toEqual({
    offsets: [5],
    processedInput: normalizedSdxlInput,
    tokens: [2575, 26_223],
  })
  expect(tokenizeLoaded(denormalizedSdxlInputBytes, 'sdxl')).toEqual({
    offsets: [5],
    processedInput: normalizedSdxlInputBytes,
    tokens: [2575, 26_223],
  })
})
test('throws on unsupported model selections', async () => {
  free()
  expect(() => countLoaded(sampleText, {model: ['gpt', 'deepseek'] as never})).toThrow('requires a single model ID')
  expect(() => tokenizeLoaded(sampleText, {model: ['gpt', 'deepseek'] as never})).toThrow('requires a single model ID')
  expect(await getErrorMessage(() => count(sampleText, {model: ['gpt', 'deepseek'] as never}))).toContain('requires a single model ID')
  expect(await getErrorMessage(() => tokenize(sampleText, {model: ['gpt', 'deepseek'] as never}))).toContain('requires a single model ID')
  expect(await getErrorMessage(() => load('bogus' as never))).toContain('Unknown model')
  expect(() => countLoaded(sampleText, {model: 'bogus' as never})).toThrow('Unknown model')
  expect(() => tokenizeLoaded(sampleText, 'bogus' as never)).toThrow('Unknown model')
  expect(await getErrorMessage(() => count(sampleText, {model: 'bogus' as never}))).toContain('Unknown model')
  expect(await getErrorMessage(() => tokenize(sampleText, 'bogus' as never))).toContain('Unknown model')
})
