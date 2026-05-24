import {decodeBase85} from './base85Decode.ts'

export type EncodedModelAssetFiles = Record<string, string>
export type ModelAssetFileContent = Uint8Array | string
export type ModelAssetFiles = Record<string, ModelAssetFileContent>

const compressedMsgpackFileExtension = '.msgpack.br'
type NodeZlibModule = typeof import('node:zlib')
const importNodeZlib = () => {
  const dynamicImport = new Function('return import("node:zlib")') as () => Promise<NodeZlibModule>
  return dynamicImport()
}
const decompressBrotli = async (bytes: Uint8Array) => {
  if (typeof DecompressionStream === 'function') {
    try {
      const decompressedStream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('brotli'))
      return new Uint8Array(await new Response(decompressedStream).arrayBuffer())
    } catch {

    }
  }
  const {brotliDecompressSync} = await importNodeZlib()
  return new Uint8Array(brotliDecompressSync(bytes))
}

export const isCompressedMsgpackFile = (fileName: string) => {
  return fileName.endsWith(compressedMsgpackFileExtension)
}

export const normalizeModelAssetFileName = (fileName: string) => {
  if (!isCompressedMsgpackFile(fileName)) {
    return fileName
  }
  return fileName.slice(0, -'.br'.length)
}

export const prepareEncodedModelAssets = async (files: EncodedModelAssetFiles): Promise<ModelAssetFiles> => {
  const entries = await Promise.all(Object.entries(files).map(async ([fileName, content]) => {
    const decodedContent = decodeBase85(content)
    if (!isCompressedMsgpackFile(fileName)) {
      return [fileName, decodedContent] as const
    }
    return [normalizeModelAssetFileName(fileName), await decompressBrotli(decodedContent)] as const
  }))
  return Object.fromEntries(entries)
}
