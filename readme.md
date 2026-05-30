# token-vocabs

Count tokens or inspect token IDs across several modern tokenizer families from one local, offline-friendly package.

## Supported models

- GPT → `o200k_base`
- Gemma 4 31B it
- Qwen 3.6 27B
- Kimi K2.6
- DeepSeek V4 Pro
- MiMo V2.5 Pro
- Stable Diffusion XL
- GLM 5.1
- MiniMax M2.7
- Hy3 Preview
- Step 3.7 Flash

## Highlights

- offline at runtime once the vendored assets are present
- browser-friendly once bundled
- exact golden outputs for the core sample fixture
- one Brotli-compressed MessagePack asset bundle per model
- browser Brotli decompression with a bundled JS fallback where native stream support is missing
- Rolldown browser builds that emit binary vocabulary bundles, shared chunks and the required WASM asset
- async auto-loading API plus loaded-only sync helpers
- one small single-model API for counts, token IDs and byte offsets
- generated tokenizer assets via `bun run fetch`
- publish-ready browser `dist/` builds that keep vocabularies outside the JavaScript entry, emit the required WASM files and include package metadata plus declarations

## Usage

```ts
import tokenize from 'token-vocabs'

console.dir(await tokenize('mind goblin', 'gpt'))
```

```ts
import {count} from 'token-vocabs'

console.dir(await count(new TextEncoder().encode('mind goblin'), {model: 'gpt'}))
```

```ts
import {load, tokenizeLoaded} from 'token-vocabs'

await load(['gpt', 'deepseek'])
console.dir(tokenizeLoaded('mind goblin', 'gpt'))
```

## Example output

```ts
await count('mind goblin', 'gpt')
// 3
```

```ts
await tokenize('mind goblin', 'gpt')
// {
//   offsets: [4, 8],
//   tokens: [77021, 18778, 4724],
// }
```

## API

### `async count(textOrBytes, optionsOrModel)`

Returns the token count for exactly one model and loads the required vocabulary bundle on demand.

`Uint8Array` input is decoded as UTF-8.

```ts
await count('mind goblin', 'sdxl')
await count('mind goblin', {model: 'gpt'})
await count(new TextEncoder().encode('mind goblin'), 'gpt')
```

### `countLoaded(textOrBytes, optionsOrModel)`

Synchronous count helper that uses the existing in-memory tokenizer state and throws if the requested vocabulary is not loaded yet.

This is useful after `await load()` or after a previous `await count()` / `await tokenize()` call has already loaded the model.

### `async tokenize(textOrBytes, optionsOrModel)`

Returns a `RawTokenizeResult` for exactly one model and loads the required vocabulary bundle on demand.

```ts
await tokenize('mind goblin', 'gpt')
await tokenize('mind goblin', {model: 'gpt'})
```

### `tokenizeLoaded(textOrBytes, optionsOrModel)`

Synchronous tokenization helper that reuses already loaded vocabularies and throws if the requested model is not in memory yet.

The result shape is:

```ts
type RawTokenizeResult = {
  offsets: number[]
  tokens: number[]
  processedInput?: string | Uint8Array
}
```

`offsets` omits the first token’s implicit `0` byte start to save one array slot.

If a tokenizer normalizes or otherwise preprocesses the input, `processedInput` contains the effective tokenizer input. Its type matches the input kind – string in, string out; `Uint8Array` in, `Uint8Array` out.

If you need results for several models, call `count()` or `tokenize()` once per model and combine the results yourself.

### `async load(modelSelection?)`

Preloads one or more model vocabularies into memory.

- `await load('gpt')` → resolves to `'gpt'`
- `await load(['gpt', 'deepseek'])` → resolves to `['gpt', 'deepseek']`
- `await load()` → loads every supported model and resolves to `modelIds`

### `free(modelId?)`

Releases a loaded model from memory, or every loaded model if no argument is provided.

### `modelIds`

Exports the supported model IDs in stable default order.

### `models`

Exports model metadata, including the original upstream source URLs used by `bun run fetch`.

### `token-vocabs/browser`

Browser entry with the same `count()`, `countLoaded()`, `tokenize()`, `tokenizeLoaded()`, `load()` and `free()` API as the desktop entry.

It loads the `.bin` asset bundles via `fetch()`.

### `token-vocabs/browser/all`

Eager browser entry that runs `await load()` at module initialization time so `countLoaded()` and `tokenizeLoaded()` work immediately after import.

## Asset workflow

Raw fetched tokenizer assets are written to `./temp/data`.

`bun run fetch` also packs one binary vocabulary bundle per model under `./temp/generated/model-assets`.

The desktop entry loads those bundles with `fs`, while the browser entry loads them with `fetch()`.

Refresh them with:

```sh
bun run fetch
```

Create a publish-ready browser bundle with:

```sh
bun run build
```

That produces a `dist/` folder containing:

- `dist/main.js` as the lazy browser entry with the same async auto-loading API as the source package
- `dist/all.js` as the eager browser entry that preloads every vocabulary
- one emitted `.bin` tokenizer bundle per model at `dist/`, shared chunks under `dist/chunks/` and the required WASM asset for browser bundlers
- `dist/package.json`, `dist/README.md`, `dist/LICENSE` and declaration files so `dist/` can be published on its own

Example lazy browser usage:

```ts
import {countLoaded, load} from './dist/main.js'

await load(['gpt', 'deepseek'])
console.dir(countLoaded('mind goblin', 'deepseek'))
```

## Notes

- `sdxl` intentionally implements the shared CLIP BPE core used by SDXL without auto-adding BOS/EOS tokens.
- GPT uses `tiktoken` lite plus a vendored `o200k_base` model string, so the browser WASM stays lean and the vocabulary still lives in the regular per-model asset bundle.
- Structured tokenizer payloads are stored inside per-model `.bin` bundles and decompressed after loading.
- Tokenizer assets are large. That is inherent to exact offline tokenization.
