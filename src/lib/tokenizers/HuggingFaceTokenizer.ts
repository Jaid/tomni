import type {ModelId} from '../models.ts'

import {Tokenizer} from '@huggingface/tokenizers'

import {readModelMsgpackFile} from '../data.ts'
import {BaseTokenizer} from './base/BaseTokenizer.ts'

type HfEncodeResult = {
  ids: Array<number>
}

type HfTokenizer = {
  encode: (text: string) => HfEncodeResult
}

type TokenizerState = {
  tokenizer: HfTokenizer
}

const TokenizerConstructor = Tokenizer as unknown as new (tokenizerJson: unknown, tokenizerConfig: unknown) => HfTokenizer

export class HuggingFaceTokenizer extends BaseTokenizer<TokenizerState> {
  constructor(readonly modelId: ModelId) {
    super()
  }

  protected override createState() {
    const tokenizerJson = readModelMsgpackFile<unknown>(this.modelId, 'tokenizer.msgpack')
    const tokenizerConfig = readModelMsgpackFile<unknown>(this.modelId, 'tokenizer_config.msgpack')
    return {
      tokenizer: new TokenizerConstructor(tokenizerJson, tokenizerConfig),
    }
  }

  protected override encodeWithState(text: string, state: TokenizerState) {
    return [...state.tokenizer.encode(text).ids]
  }
}
