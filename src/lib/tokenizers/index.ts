import type {ModelId} from '../models.ts'
import type {RawTokenizeResult, TokenizeInput} from '../tokenization.ts'

import {models} from '../models.ts'
import {ClipTokenizer} from './ClipTokenizer.ts'
import {HuggingFaceTokenizer} from './HuggingFaceTokenizer.ts'
import {TiktokenTokenizer} from './TiktokenTokenizer.ts'

type TokenizerLike = {
  encode: (input: TokenizeInput) => Array<number>
  free: () => void
  getTokenCount: (input: TokenizeInput) => number
  tokenize: (input: TokenizeInput) => RawTokenizeResult
}

const tokenizerCache = new Map<ModelId, TokenizerLike>

export const getTokenizer = (modelId: ModelId) => {
  const cached = tokenizerCache.get(modelId)
  if (cached) {
    return cached
  }
  const model = models[modelId]
  let tokenizer: TokenizerLike
  switch (model.kind) {
    case 'tiktoken-builtin': {
      tokenizer = new TiktokenTokenizer(modelId)
      break
    }
    case 'tiktoken-custom': {
      tokenizer = new TiktokenTokenizer(modelId)
      break
    }
    case 'huggingface': {
      tokenizer = new HuggingFaceTokenizer(modelId)
      break
    }
    case 'clip-bpe': {
      tokenizer = new ClipTokenizer(modelId)
      break
    }
  }
  tokenizerCache.set(modelId, tokenizer)
  return tokenizer
}

export const freeTokenizers = (modelId?: ModelId) => {
  if (modelId) {
    const tokenizer = tokenizerCache.get(modelId)
    tokenizer?.free()
    tokenizerCache.delete(modelId)
    return
  }
  for (const tokenizer of tokenizerCache.values()) {
    tokenizer.free()
  }
  tokenizerCache.clear()
}
