export type ModelId = 'deepseek' | 'gemma' | 'glm' | 'gpt' | 'hy' | 'kimi' | 'mimo' | 'minimax' | 'qwen' | 'sdxl' | 'step'

export type ModelDefinition = BuiltinTiktokenModelDefinition | ClipBpeModelDefinition | CustomTiktokenModelDefinition | HuggingFaceModelDefinition

type BaseModelDefinition = {
  openrouter?: string
  title: string
}

type BuiltinTiktokenModelDefinition = BaseModelDefinition & {
  encoding: 'o200k_base'
  kind: 'tiktoken-builtin'
  source: {
    encodingJsonUrl: string
  }
}

type CustomTiktokenModelDefinition = BaseModelDefinition & {
  kind: 'tiktoken-custom'
  source: {
    modelUrl: string
    tokenizerConfigUrl: string
    tokenizerImplementationUrl: string
  }
}

type HuggingFaceModelDefinition = BaseModelDefinition & {
  kind: 'huggingface'
  source: {
    specialTokensMapUrl?: string
    tokenizerConfigUrl: string
    tokenizerJsonUrl: string
  }
}

type ClipBpeModelDefinition = BaseModelDefinition & {
  kind: 'clip-bpe'
  source: {
    mergesUrl: string
    specialTokensMapUrl?: string
    tokenizerConfigUrl: string
    vocabUrl: string
  }
}

export const models = {
  gpt: {
    encoding: 'o200k_base',
    kind: 'tiktoken-builtin',
    openrouter: 'openai/gpt-5.5',
    source: {
      encodingJsonUrl: 'https://tiktoken.pages.dev/js/o200k_base.json',
    },
    title: 'GPT-5.5',
  },
  gemma: {
    kind: 'huggingface',
    openrouter: 'google/gemma-4-31b-it',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/google/gemma-4-31B-it/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/google/gemma-4-31B-it/resolve/main/tokenizer.json',
    },
    title: 'Gemma 4 31B it',
  },
  qwen: {
    kind: 'huggingface',
    openrouter: 'qwen/qwen3.6-27b',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/Qwen/Qwen3.6-27B/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/Qwen/Qwen3.6-27B/resolve/main/tokenizer.json',
    },
    title: 'Qwen 3.6 27B',
  },
  kimi: {
    kind: 'tiktoken-custom',
    openrouter: 'moonshotai/kimi-k2.6',
    source: {
      modelUrl: 'https://huggingface.co/moonshotai/Kimi-K2.6/resolve/main/tiktoken.model',
      tokenizerConfigUrl: 'https://huggingface.co/moonshotai/Kimi-K2.6/resolve/main/tokenizer_config.json',
      tokenizerImplementationUrl: 'https://huggingface.co/moonshotai/Kimi-K2.6/resolve/main/tokenization_kimi.py',
    },
    title: 'Kimi K2.6',
  },
  deepseek: {
    kind: 'huggingface',
    openrouter: 'deepseek/deepseek-v4-pro',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/resolve/main/tokenizer.json',
    },
    title: 'DeepSeek V4 Pro',
  },
  mimo: {
    kind: 'huggingface',
    openrouter: 'xiaomi/mimo-v2.5-pro',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/XiaomiMiMo/MiMo-V2.5-Pro/resolve/main/tokenizer.json',
    },
    title: 'MiMo V2.5 Pro',
  },
  sdxl: {
    kind: 'clip-bpe',
    source: {
      mergesUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/merges.txt',
      specialTokensMapUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/special_tokens_map.json',
      tokenizerConfigUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/tokenizer_config.json',
      vocabUrl: 'https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/tokenizer_2/vocab.json',
    },
    title: 'Stable Diffusion XL',
  },
  glm: {
    kind: 'huggingface',
    openrouter: 'zai-org/glm-5.1',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/zai-org/GLM-5.1/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/zai-org/GLM-5.1/resolve/main/tokenizer.json',
    },
    title: 'GLM 5.1',
  },
  minimax: {
    kind: 'huggingface',
    openrouter: 'minimax/minimax-m2.7',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/MiniMaxAI/MiniMax-M2.7/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/MiniMaxAI/MiniMax-M2.7/resolve/main/tokenizer.json',
    },
    title: 'MiniMax M2.7',
  },
  hy: {
    kind: 'huggingface',
    openrouter: 'tencent/hy3-preview',
    title: 'Hy3 Preview',
    source: {
      tokenizerConfigUrl: 'https://huggingface.co/tencent/Hy3-preview/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/tencent/Hy3-preview/resolve/main/tokenizer.json',
    },
  },
  step: {
    kind: 'huggingface',
    openrouter: 'stepfun/step-3.7-flash',
    source: {
      specialTokensMapUrl: 'https://huggingface.co/stepfun-ai/Step-3.7-Flash/resolve/main/special_tokens_map.json',
      tokenizerConfigUrl: 'https://huggingface.co/stepfun-ai/Step-3.7-Flash/resolve/main/tokenizer_config.json',
      tokenizerJsonUrl: 'https://huggingface.co/stepfun-ai/Step-3.7-Flash/resolve/main/tokenizer.json',
    },
    title: 'Step 3.7 Flash',
  },
} as const satisfies Record<ModelId, ModelDefinition>

export const modelIds = Object.keys(models) as Array<ModelId>
