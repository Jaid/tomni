import type {ModelId} from '../models.ts'
import type {TiktokenEncoding} from 'tiktoken'

import {get_encoding, Tiktoken} from 'tiktoken'

import {readModelMsgpackFile, readModelTextFile} from '../data.ts'
import {BaseTokenizer} from './base/BaseTokenizer.ts'

type BuiltinTiktokenConfig = {
  encoding: TiktokenEncoding
}

type CustomTiktokenConfig = {
  pat_str: string
  special_tokens: Record<string, number>
}

export class BuiltinTiktokenTokenizer extends BaseTokenizer<Tiktoken> {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const config = readModelMsgpackFile<BuiltinTiktokenConfig>(this.modelId, 'config.msgpack')
    return get_encoding(config.encoding)
  }

  protected override encodeWithState(text: string, state: Tiktoken) {
    return [...state.encode(text)]
  }
}

export class CustomTiktokenTokenizer extends BaseTokenizer<Tiktoken> {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const config = readModelMsgpackFile<CustomTiktokenConfig>(this.modelId, 'config.msgpack')
    const model = readModelTextFile(this.modelId, 'tiktoken.model')
    return new Tiktoken(model, config.special_tokens, config.pat_str)
  }

  protected override encodeWithState(text: string, state: Tiktoken) {
    return [...state.encode(text)]
  }
}
