import path from 'node:path'

import fs from 'fs-extra'

const rootFolder = path.resolve(import.meta.dirname, '..')
const entrypoint = path.join(rootFolder, 'src/main.ts')
const generatedAssetsIndexFile = path.join(rootFolder, 'temp/generated/model-assets/index.ts')
const distFolder = path.join(rootFolder, 'dist')
const browserDistFolder = path.join(distFolder, 'browser')
const exists = async (filePath: string) => {
  try {
    await fs.stat(filePath)
    return true
  } catch {
    return false
  }
}
if (!await exists(generatedAssetsIndexFile)) {
  throw new Error(`Missing generated tokenizer assets at ${JSON.stringify(generatedAssetsIndexFile)}. Run “bun run fetch” first.`)
}
await fs.rm(distFolder, {
  force: true,
  recursive: true,
})
await fs.mkdir(distFolder, {recursive: true})
const buildTargets = [
  {
    outdir: distFolder,
    target: 'bun',
    title: 'runtime',
  },
  {
    outdir: browserDistFolder,
    target: 'browser',
    title: 'browser',
  },
] as const
let outputCount = 0
for (const buildTarget of buildTargets) {
  const result = await Bun.build({
    entrypoints: [entrypoint],
    format: 'esm',
    outdir: buildTarget.outdir,
    target: buildTarget.target,
  })
  if (!result.success) {
    for (const log of result.logs) {
      console.error(log)
    }
    throw new Error(`${buildTarget.title} build failed.`)
  }
  outputCount += result.outputs.length
}
console.log(`Built ${outputCount} file${outputCount === 1 ? '' : 's'} into ${distFolder}.`)
