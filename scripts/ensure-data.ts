import path from 'node:path'

import fs from 'fs-extra'

const rootFolder = path.resolve(import.meta.dirname, '..')
const generatedAssetsIndexFile = path.join(rootFolder, 'temp/generated/model-assets/index.ts')
if (!await fs.pathExists(generatedAssetsIndexFile)) {
  console.log(`Missing generated tokenizer assets at ${generatedAssetsIndexFile}. Running fetch...`)
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
