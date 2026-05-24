import type {ModelId} from '../models.ts'

import {readModelMsgpackFile, readModelTextFile} from '../data.ts'
import {BaseTokenizer} from './base/BaseTokenizer.ts'

type ClipTokenizerConfig = {
  bos_token?: {content: string} | string
  eos_token?: {content: string} | string
  unk_token?: {content: string} | string
}

type ClipTokenizerState = {
  byteEncoder: Array<string>
  mergeRanks: Map<string, number>
  specialTokenIds: Map<string, number>
  unknownTokenId: number
  vocabulary: Partial<Record<string, number>>
}

const clipPattern = /<\|startoftext\|>|<\|endoftext\|>|'d|'ll|'m|'re|'s|'t|'ve|\p{L}+|\p{N}|[^\s\p{L}\p{N}]+/gu
const whitespacePattern = /\s+/gu
const textEncoder = new TextEncoder
const toTokenContent = (value: unknown) => {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'content' in value && typeof value.content === 'string') {
    return value.content
  }
}
const createByteEncoder = () => {
  const byteEncoder = Array.from({length: 256})
  const bytes = [
    ...Array.from({length: 94}, (_, index) => index + 33),
    ...Array.from({length: 12}, (_, index) => index + 161),
    ...Array.from({length: 82}, (_, index) => index + 174),
  ]
  const codePoints = [...bytes]
  let extraCodePoint = 256
  for (let byte = 0; byte < 256; byte++) {
    if (!bytes.includes(byte)) {
      bytes.push(byte)
      codePoints.push(extraCodePoint)
      extraCodePoint++
    }
  }
  for (const [index, byte] of bytes.entries()) {
    byteEncoder[byte] = String.fromCodePoint(codePoints[index])
  }
  return byteEncoder
}
const createMergeRanks = (mergesText: string) => {
  const mergeRanks = new Map<string, number>
  for (const [index, mergeLine] of mergesText.split(/\r?\n/u).filter(Boolean).filter(entry => !entry.startsWith('#')).entries()) {
    mergeRanks.set(mergeLine, index)
  }
  return mergeRanks
}
const normalizeText = (text: string) => {
  return text.normalize('NFC').replaceAll(whitespacePattern, ' ').trim().toLowerCase()
}

export class ClipTokenizer extends BaseTokenizer<ClipTokenizerState> {
  readonly #bpeCache = new Map<string, Array<string>>

  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const vocabulary = readModelMsgpackFile<Partial<Record<string, number>>>(this.modelId, 'vocab.msgpack')
    const tokenizerConfig = readModelMsgpackFile<ClipTokenizerConfig>(this.modelId, 'tokenizer_config.msgpack')
    const specialTokenIds = new Map<string, number>
    const unknownTokenContent = toTokenContent(tokenizerConfig.unk_token) ?? '<|endoftext|>'
    const unknownTokenId = vocabulary[unknownTokenContent]
    if (unknownTokenId === undefined) {
      throw new Error(`Could not find CLIP unknown token ${JSON.stringify(unknownTokenContent)} in ${JSON.stringify(this.modelId)} vocabulary.`)
    }
    for (const value of [tokenizerConfig.bos_token, tokenizerConfig.eos_token, tokenizerConfig.unk_token]) {
      const content = toTokenContent(value)
      if (!content) {
        continue
      }
      const tokenId = vocabulary[content]
      if (tokenId !== undefined) {
        specialTokenIds.set(content, tokenId)
      }
    }
    return {
      byteEncoder: createByteEncoder(),
      mergeRanks: createMergeRanks(readModelTextFile(this.modelId, 'merges.txt')),
      specialTokenIds,
      unknownTokenId,
      vocabulary,
    }
  }

  protected override encodeWithState(text: string, state: ClipTokenizerState) {
    const normalizedText = normalizeText(text)
    if (!normalizedText) {
      return []
    }
    const ids: Array<number> = []
    for (const match of normalizedText.matchAll(clipPattern)) {
      const piece = match[0]
      const specialTokenId = state.specialTokenIds.get(piece)
      if (specialTokenId !== undefined) {
        ids.push(specialTokenId)
        continue
      }
      const encodedPiece = Array.from(textEncoder.encode(piece), byte => state.byteEncoder[byte]).join('')
      for (const token of this.#applyBpe(encodedPiece, state.mergeRanks)) {
        ids.push(state.vocabulary[token] ?? state.unknownTokenId)
      }
    }
    return ids
  }

  #applyBpe(token: string, mergeRanks: Map<string, number>) {
    const cached = this.#bpeCache.get(token)
    if (cached) {
      return cached
    }
    const characters = [...token]
    if (!characters.length) {
      const result: Array<string> = []
      this.#bpeCache.set(token, result)
      return result
    }
    let word = [...characters.slice(0, -1), `${characters.at(-1)!}</w>`]
    while (word.length > 1) {
      let bestPairIndex = -1
      let bestPairRank = Number.POSITIVE_INFINITY
      for (let index = 0; index < word.length - 1; index++) {
        const rank = mergeRanks.get(`${word[index]} ${word[index + 1]}`)
        if (rank !== undefined && rank < bestPairRank) {
          bestPairRank = rank
          bestPairIndex = index
        }
      }
      if (bestPairIndex < 0) {
        break
      }
      const mergedWord: Array<string> = []
      for (let index = 0; index < word.length; index++) {
        if (index === bestPairIndex) {
          mergedWord.push(`${word[index]}${word[index + 1]}`)
          index++
          continue
        }
        mergedWord.push(word[index])
      }
      word = mergedWord
    }
    this.#bpeCache.set(token, word)
    return word
  }
}
