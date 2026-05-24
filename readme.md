# tomni

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

## Highlights

- offline at runtime once the vendored assets are present
- browser-friendly once bundled
- exact golden outputs for the core sample fixture
- Brotli-compressed MessagePack tokenizer assets with Map-backed structured loading
- Rolldown browser builds that can lazy-load one chunk per vocabulary, plus an eager `all.js` variant and the required WASM asset
- sync API for convenience
- one shared interface for count-oriented and token-ID-oriented usage
- generated tokenizer assets via `bun run fetch`
- portable `dist/` builds that bundle tokenizer assets and emit the required WASM files

## Usage

```ts
import countTokens from 'tomni'

console.dir(countTokens('mind goblin'))
```

```ts
import countTokens from 'tomni'

console.dir(countTokens('mind goblin', {model: ['gpt', 'deepseek']}))
```

```ts
import countTokens from 'tomni'

console.dir(countTokens('mind goblin', 'gpt'))
```

```ts
import {tokenize} from 'tomni'

console.dir(tokenize('mind goblin'))
```

## Example output

```ts
countTokens('mind goblin')
// {
//   gpt: 3,
//   gemma: 2,
//   qwen: 3,
//   kimi: 4,
//   deepseek: 4,
//   mimo: 3,
//   sdxl: 2,
//   glm: 3,
//   minimax: 3,
// }
```

```ts
tokenize('mind goblin')
// {
//   gpt: [77021, 18778, 4724],
//   gemma: [24447, 218798],
//   qwen: [36475, 338, 45491],
//   kimi: [66468, 970, 3145, 259],
//   deepseek: [60514, 807, 3778, 261],
//   mimo: [37724, 342, 47061],
//   sdxl: [2575, 26223],
//   glm: [37528, 342, 46771],
//   minimax: [68201, 113859, 259],
// }
```

## API

### `countTokens(text, options?)`

Returns token counts.

```ts
countTokens('mind goblin')
countTokens('mind goblin', 'sdxl')
countTokens('mind goblin', {model: 'gpt'})
countTokens('mind goblin', {model: ['gpt', 'deepseek']})
```

### `tokenize(text, options?)`

Returns token ID arrays with the same selection rules as `countTokens()`.

### `modelIds`

Exports the supported model IDs in stable default order.

### `models`

Exports model metadata, including the original upstream source URLs used by `bun run fetch`.

### `tomni/browser`

Lazy browser entry with the same `countTokens()` and `tokenize()` API, plus:

- `loadModel(modelId)`
- `loadModels(modelSelection?)`
- `isModelLoaded(modelId)`
- `getLoadedModelIds()`

Load the required vocabularies first, then call the sync tokenization API.

### `tomni/browser/all`

Eager browser entry that preloads every vocabulary and keeps the original “load once, tokenize immediately” behavior.

## Asset workflow

Raw fetched tokenizer assets are written to `./temp/data`.

`bun run fetch` also generates importable asset modules under `./temp/generated`, which is what the library loads at runtime.

Refresh them with:

```sh
bun run fetch
```

Create a portable runtime bundle with:

```sh
bun run build
```

That produces a `dist/` folder containing:

- `dist/main.js` for Bun/runtime usage
- `dist/browser/main.js` as the lazy browser entry – call `loadModels()` before tokenizing
- `dist/browser/all.js` as the eager browser entry that preloads every vocabulary
- emitted chunk files under `dist/browser/vocabulary/` plus the required WASM asset for browser bundlers

Example lazy browser usage:

```ts
import {countTokens, loadModels} from './dist/browser/main.js'

await loadModels(['gpt', 'deepseek'])
console.dir(countTokens('mind goblin', {model: ['gpt', 'deepseek']}))
```

## Notes

- `sdxl` intentionally implements the shared CLIP BPE core used by SDXL without auto-adding BOS/EOS tokens.
- GPT uses `tiktoken`’s built-in `o200k_base` implementation, but the upstream encoder payload is still fetched and converted to MessagePack for completeness.
- Structured tokenizer payloads are emitted into generated modules as ASCII85-encoded `.msgpack.br` blobs and decompressed before use.
- Tokenizer assets are large. That is inherent to exact offline tokenization.
