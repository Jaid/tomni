import type {TiktokenEncoding} from 'tiktoken/init'

import {get_encoding, init, Tiktoken} from 'tiktoken/init'
import tiktokenWasmUrl from 'tiktoken/tiktoken_bg.wasm?url'

const tiktokenWasmHref = new URL(tiktokenWasmUrl, import.meta.url).href
const initializeTiktoken = async () => {
  await init(async imports => {
    const response = await fetch(tiktokenWasmHref)
    if (!response.ok) {
      throw new Error(`Failed to load tiktoken WASM from ${JSON.stringify(tiktokenWasmHref)}: ${response.status} ${response.statusText}`)
    }
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(response.clone(), imports)
      } catch {

      }
    }
    return WebAssembly.instantiate(await response.arrayBuffer(), imports)
  })
}
await initializeTiktoken()

export {get_encoding, Tiktoken}
export type {TiktokenEncoding}
