import type {ModelId} from '../models.ts'

import {Tiktoken} from '#tiktoken'

import {readModelMsgpackFile, readModelTextFile} from '../data.ts'
import {getRequiredMapValue, toPlainObject} from '../structuredData.ts'
import {toRawTokenizeResultFromTokenByteLengths} from '../tokenization.ts'
import {BaseTokenizer} from './base/BaseTokenizer.ts'

const createTiktokenState = (modelId: ModelId) => {
  const config = readModelMsgpackFile<Map<string, unknown>>(modelId, 'config.msgpack')
  const model = readModelTextFile(modelId, 'tiktoken.model')
  const specialTokens = toPlainObject(getRequiredMapValue<Map<string, unknown>>(config, 'special_tokens')) as Record<string, number>
  return new Tiktoken(model, specialTokens, getRequiredMapValue<string>(config, 'pat_str'))
}
abstract class BaseTiktokenTokenizer extends BaseTokenizer<Tiktoken> {
  protected override disposeState(state: Tiktoken) {
    state.free()
  }

  protected override tokenizeWithState(text: string, state: Tiktoken) {
    const tokenIds = this.encodeWithState(text, state)
    return toRawTokenizeResultFromTokenByteLengths(tokenIds, tokenIds.map(tokenId => state.decode_single_token_bytes(tokenId).length))
  }
}

export class TiktokenTokenizer extends BaseTiktokenTokenizer {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    return createTiktokenState(this.modelId)
  }

  protected override encodeWithState(text: string, state: Tiktoken) {
    return [...state.encode(text)]
  }
}
