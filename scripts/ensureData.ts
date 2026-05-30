import path from 'node:path'

import fs from 'fs-extra'

import {modelIds} from '#src/lib/models.ts'

import {tokenizerAssetVersion} from './lib/tokenizerAssetVersion.ts'

const rootFolder = path.resolve(import.meta.dirname, '..')
const generatedAssetsFolder = path.join(rootFolder, 'temp/generated/model-assets')
const generatedAssetFiles = modelIds.map(modelId => path.join(generatedAssetsFolder, `${modelId}.bin`))
const generatedAssetVersionFile = path.join(generatedAssetsFolder, '_version.txt')
const getMissingGeneratedAssetsFile = async () => {
  for (const generatedAssetFile of generatedAssetFiles) {
    if (!await fs.pathExists(generatedAssetFile)) {
      return generatedAssetFile
    }
  }
}
const hasCurrentGeneratedAssetVersion = async () => {
  if (!await fs.pathExists(generatedAssetVersionFile)) {
    return false
  }
  const version = (await fs.readFile(generatedAssetVersionFile, 'utf8')).trim()
  return version === String(tokenizerAssetVersion)
}
const missingGeneratedAssetsFile = await getMissingGeneratedAssetsFile()
const hasCurrentVersion = await hasCurrentGeneratedAssetVersion()
if (missingGeneratedAssetsFile || !hasCurrentVersion) {
  if (missingGeneratedAssetsFile) {
    console.log(`Missing generated tokenizer assets at ${missingGeneratedAssetsFile}. Running fetch...`)
  } else {
    console.log(`Generated tokenizer assets are stale. Expected version ${tokenizerAssetVersion}. Running fetch...`)
  }
  const fetchProcess = Bun.spawn(['bun', 'run', 'fetch'], {
    cwd: rootFolder,
    stderr: 'inherit',
    stdout: 'inherit',
    stdin: 'inherit',
  })
  const exitCode = await fetchProcess.exited
  if (exitCode !== 0) {
    throw new Error(`Tokenizer asset fetch failed with exit code ${exitCode}.`)
  }
}
