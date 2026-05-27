import type {CodeSplittingGroup, OutputOptions, RolldownOptions} from 'rolldown'

import path from 'node:path'

import {defineConfig} from 'rolldown'
import {wasm} from 'rolldown-plugin-wasm'

import {modelIds} from './src/lib/models.ts'

const rootFolder = import.meta.dirname
const distFolder = path.join(rootFolder, 'dist')
const browserEntryFiles = {
  all: path.join(rootFolder, 'src/browser/all.ts'),
  main: path.join(rootFolder, 'src/browser/main.ts'),
} as const
const sharedChunkFolderName = 'chunks'
const browserVocabularyPattern = new RegExp(String.raw`/src/browser/vocabulary/(?<modelId>${modelIds.join('|')})\.ts$`, 'u')
const normalizeModuleId = (moduleId: string) => {
  return moduleId.replaceAll('\\', '/')
}
const toVocabularyChunkName = (moduleId: string) => {
  const match = browserVocabularyPattern.exec(normalizeModuleId(moduleId))
  if (!match?.groups?.modelId) {
    return null
  }
  return `vocabulary/${match.groups.modelId}`
}
const vocabularyCodeSplittingGroup: CodeSplittingGroup = {
  minSize: 1,
  name: toVocabularyChunkName,
  priority: 100,
}
const createBaseOutput = (): OutputOptions => {
  return {
    assetFileNames: '[name][extname]',
    cleanDir: false,
    format: 'es',
    minify: true,
  }
}
const createBaseConfig = (): Omit<RolldownOptions, 'output'> & {output: OutputOptions} => {
  return {
    output: createBaseOutput(),
  }
}
const createBrowserConfig = (): RolldownOptions => {
  const config = createBaseConfig()
  return {
    ...config,
    input: browserEntryFiles,
    output: {
      ...config.output,
      entryFileNames: '[name].js',
      chunkFileNames: chunkInfo => {
        if (!chunkInfo.name.startsWith('vocabulary/')) {
          return `${sharedChunkFolderName}/${chunkInfo.name}.js`
        }
        return `${chunkInfo.name}.js`
      },
      codeSplitting: {
        groups: [vocabularyCodeSplittingGroup],
      },
      dir: distFolder,
    },
    platform: 'browser',
    plugins: [
      wasm({
        fileName: '[name][extname]',
        targetEnv: 'browser',
      }),
    ],
    resolve: {
      alias: {
        tiktoken: path.join(rootFolder, 'src/browser/tiktoken.ts'),
      },
    },
  }
}

export default defineConfig([createBrowserConfig()])
