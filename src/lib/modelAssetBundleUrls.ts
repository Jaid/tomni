import type {ModelId} from './models.ts'

export const modelAssetBundleUrls = {
  gpt: new URL('../../temp/generated/model-assets/gpt.msgpack.br', import.meta.url),
  gemma: new URL('../../temp/generated/model-assets/gemma.msgpack.br', import.meta.url),
  qwen: new URL('../../temp/generated/model-assets/qwen.msgpack.br', import.meta.url),
  kimi: new URL('../../temp/generated/model-assets/kimi.msgpack.br', import.meta.url),
  deepseek: new URL('../../temp/generated/model-assets/deepseek.msgpack.br', import.meta.url),
  mimo: new URL('../../temp/generated/model-assets/mimo.msgpack.br', import.meta.url),
  sdxl: new URL('../../temp/generated/model-assets/sdxl.msgpack.br', import.meta.url),
  glm: new URL('../../temp/generated/model-assets/glm.msgpack.br', import.meta.url),
  minimax: new URL('../../temp/generated/model-assets/minimax.msgpack.br', import.meta.url),
  hy: new URL('../../temp/generated/model-assets/hy.msgpack.br', import.meta.url),
  step: new URL('../../temp/generated/model-assets/step.msgpack.br', import.meta.url),
} as const satisfies Record<ModelId, URL>
