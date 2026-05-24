import type {EncodedModelAssetFiles, ModelAssetFiles} from '../modelAssets.ts'

import {brotliDecompressSync} from 'node:zlib'

import {decodeBase85} from '../base85Decode.ts'
import {isCompressedMsgpackFile, normalizeModelAssetFileName} from '../modelAssets.ts'

export const prepareEncodedModelAssetsSync = (files: EncodedModelAssetFiles): ModelAssetFiles => {
  return Object.fromEntries(Object.entries(files).map(([fileName, content]) => {
    const decodedContent = decodeBase85(content)
    if (!isCompressedMsgpackFile(fileName)) {
      return [fileName, decodedContent] as const
    }
    return [normalizeModelAssetFileName(fileName), new Uint8Array(brotliDecompressSync(decodedContent))] as const
  }))
}
