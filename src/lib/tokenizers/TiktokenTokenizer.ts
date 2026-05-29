import type {TiktokenEncoding} from '#tiktoken'
import type {ModelId} from '../models.ts'

import {get_encoding, Tiktoken} from '#tiktoken'

import {readModelMsgpackFile, readModelTextFile} from '../data.ts'
import {getRequiredMapValue, toPlainObject} from '../structuredData.ts'
import {toRawTokenizeResultFromTokenByteLengths} from '../tokenization.ts'
import {BaseTokenizer} from './base/BaseTokenizer.ts'

abstract class BaseTiktokenTokenizer extends BaseTokenizer<Tiktoken> {
  protected override disposeState(state: Tiktoken) {
    state.free()
  }

  protected override tokenizeWithState(text: string, state: Tiktoken) {
    const tokenIds = this.encodeWithState(text, state)
    return toRawTokenizeResultFromTokenByteLengths(tokenIds, tokenIds.map(tokenId => state.decode_single_token_bytes(tokenId).length))
  }
}

export class BuiltinTiktokenTokenizer extends BaseTiktokenTokenizer {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const config = readModelMsgpackFile<Map<string, unknown>>(this.modelId, 'config.msgpack')
    return get_encoding(getRequiredMapValue<TiktokenEncoding>(config, 'encoding'))
  }

  protected override encodeWithState(text: string, state: Tiktoken) {
    return [...state.encode(text)]
  }
}

export class CustomTiktokenTokenizer extends BaseTiktokenTokenizer {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const config = readModelMsgpackFile<Map<string, unknown>>(this.modelId, 'config.msgpack')
    const model = readModelTextFile(this.modelId, 'tiktoken.model')
    const specialTokens = toPlainObject(getRequiredMapValue<Map<string, unknown>>(config, 'special_tokens')) as Record<string, number>
    return new Tiktoken(model, specialTokens, getRequiredMapValue<string>(config, 'pat_str'))
  }

  protected override encodeWithState(text: string, state: Tiktoken) {
    return [...state.encode(text)]
  }
}
