import {init, Tiktoken} from 'tiktoken/lite/init'
import tiktokenWasmUrl from 'tiktoken/lite/tiktoken_bg.wasm?url'

type TiktokenInitImports = Parameters<Parameters<typeof init>[0]>[0]
type WasmImports = Parameters<typeof WebAssembly.instantiate>[1]

const tiktokenWasmHref = new URL(tiktokenWasmUrl, import.meta.url).href
const initializeTiktoken = async () => {
  await init(async (imports: TiktokenInitImports) => {
    const wasmImports = imports as WasmImports
    const response = await fetch(tiktokenWasmHref)
    if (!response.ok) {
      throw new Error(`Failed to load tiktoken WASM from ${JSON.stringify(tiktokenWasmHref)}: ${response.status} ${response.statusText}`)
    }
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(response.clone() as unknown as Response, wasmImports)
      } catch {

      }
    }
    return WebAssembly.instantiate(await response.arrayBuffer(), wasmImports)
  })
}
await initializeTiktoken()

export {Tiktoken}
