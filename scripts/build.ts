import path from 'node:path'

import fs from 'fs-extra'

type RootPackageJson = {
  author?: Record<string, unknown> | string
  bugs?: {url?: string} | string
  description?: string
  funding?: Record<string, unknown> | string
  homepage?: string
  keywords?: Array<string>
  license?: string
  name: string
  repository?: {type?: string
    url?: string} | string
  version: string
}

const bunExecutable = Bun.which('bun') ?? process.execPath
const rootFolder = path.resolve(import.meta.dirname, '..')
const configFile = path.join(rootFolder, 'rolldown.config.ts')
const declarationConfigFile = path.join(rootFolder, 'tsconfig.build.json')
const distFolder = path.join(rootFolder, 'dist')
const generatedAssetsIndexFile = path.join(rootFolder, 'temp/generated/model-assets/index.ts')
const packageJsonFile = path.join(rootFolder, 'package.json')
const assetWorkflowHeading = '## Asset workflow'
const relativeTypeScriptImportPattern = /(["'])(\.{1,2}\/[^"']+)\.ts\1/gu
const toForwardSlashes = (filePath: string) => {
  return filePath.replaceAll('\\', '/')
}
const escapeRegularExpression = (value: string) => {
  return value.replaceAll(/[$()*+.?[\\\]^{|}]/gu, String.raw`\$&`)
}
const normalizeRepositoryUrl = (repository: RootPackageJson['repository']) => {
  const repositoryUrl = typeof repository === 'string' ? repository : repository?.url
  if (!repositoryUrl) {
    return
  }
  if (repositoryUrl.startsWith('github:')) {
    return `https://github.com/${repositoryUrl.slice('github:'.length)}`
  }
  if (repositoryUrl.startsWith('git@github.com:')) {
    return `https://github.com/${repositoryUrl.slice('git@github.com:'.length).replace(/\.git$/u, '')}`
  }
  return repositoryUrl.replace(/^git\+/u, '').replace(/\.git$/u, '')
}
const runCommand = async (command: Array<string>, label: string) => {
  const commandProcess = Bun.spawn(command, {
    cwd: rootFolder,
    stderr: 'inherit',
    stdout: 'inherit',
    stdin: 'inherit',
  })
  const exitCode = await commandProcess.exited
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}.`)
  }
}
const copyPreparedTextFile = async (candidateRelativePaths: Array<string>, outputRelativePath: string, transform?: (content: string) => string) => {
  for (const candidateRelativePath of candidateRelativePaths) {
    const inputFile = Bun.file(path.join(rootFolder, candidateRelativePath))
    if (!await inputFile.exists()) {
      continue
    }
    const outputFile = path.join(distFolder, outputRelativePath)
    const content = await inputFile.text()
    await Bun.write(outputFile, transform ? transform(content) : content)
    return outputFile
  }
  throw new Error(`Missing required source file. Tried: ${candidateRelativePaths.map(relativePath => JSON.stringify(relativePath)).join(', ')}.`)
}
const prepareDistributionReadme = (content: string, packageName: string) => {
  const replacement = [
    '## Distribution layout',
    '',
    `The published browser package exposes \`${packageName}\` and \`${packageName}/browser/all\` as the eager entry backed by \`all.js\`, plus \`${packageName}/browser\` as the lazy entry backed by \`main.js\`.`,
    '',
    'It also contains:',
    '',
    '- emitted chunk files under `vocabulary/` and `chunks/`, plus the required WASM asset',
    '- `package.json`, `README.md`, `LICENSE` and declaration files so the folder can be published on its own',
    '',
    'Example lazy browser usage from the published package:',
    '',
    '```ts',
    `import {countTokens, loadModels} from '${packageName}/browser'`,
    '',
    "await loadModels(['gpt', 'deepseek'])",
    "console.dir(countTokens('mind goblin', {model: ['gpt', 'deepseek']}))",
    '```',
    '',
    '',
  ].join('\n')
  const sectionStart = content.indexOf(assetWorkflowHeading)
  if (sectionStart === -1) {
    return `${content.trimEnd()}\n\n${replacement}`
  }
  const remainingContent = content.slice(sectionStart + assetWorkflowHeading.length)
  const nextSectionMatch = /^## /mu.exec(remainingContent)
  const sectionEnd = nextSectionMatch ? sectionStart + assetWorkflowHeading.length + nextSectionMatch.index : content.length
  return `${content.slice(0, sectionStart)}${replacement}${content.slice(sectionEnd)}`
}
const rewriteDeclarationImports = async () => {
  const declarationGlob = new Bun.Glob('**/*.d.ts')
  for await (const relativePath of declarationGlob.scan({
    cwd: distFolder,
    onlyFiles: true,
  })) {
    const outputFile = path.join(distFolder, relativePath)
    const content = await Bun.file(outputFile).text()
    const rewritten = content.replaceAll(relativeTypeScriptImportPattern, '$1$2.js$1')
    if (rewritten !== content) {
      await Bun.write(outputFile, rewritten)
    }
  }
}
const rewriteWasmAssetReferences = async () => {
  const wasmRelativePaths = [] as Array<string>
  const wasmGlob = new Bun.Glob('*.wasm')
  for await (const relativePath of wasmGlob.scan({
    cwd: distFolder,
    onlyFiles: true,
  })) {
    wasmRelativePaths.push(relativePath)
  }
  if (wasmRelativePaths.length === 0) {
    return
  }
  const javascriptGlob = new Bun.Glob('**/*.js')
  for await (const relativePath of javascriptGlob.scan({
    cwd: distFolder,
    onlyFiles: true,
  })) {
    const outputFile = path.join(distFolder, relativePath)
    const javascriptFolder = path.join(distFolder, path.dirname(relativePath))
    const content = await Bun.file(outputFile).text()
    let rewritten = content
    for (const wasmRelativePath of wasmRelativePaths) {
      const assetFileName = path.basename(wasmRelativePath)
      const assetFile = path.join(distFolder, wasmRelativePath)
      const assetImportPathRelativeToFile = toForwardSlashes(path.relative(javascriptFolder, assetFile))
      const assetImportPath = assetImportPathRelativeToFile.startsWith('.') ? assetImportPathRelativeToFile : `./${assetImportPathRelativeToFile}`
      const assetNamePattern = new RegExp(`(["'\`])${escapeRegularExpression(assetFileName)}\\1`, 'gu')
      rewritten = rewritten.replaceAll(assetNamePattern, `$1${assetImportPath}$1`)
    }
    if (rewritten !== content) {
      await Bun.write(outputFile, rewritten)
    }
  }
}
const writeEntryDeclarations = async () => {
  const mainDeclarationLines = [
    "import type {ModelId, ModelSelection} from './lib/api.js'",
    '',
    "export {countTokens, modelIds, models, tokenize} from './lib/api.js'",
    "export {default} from './lib/api.js'",
    "export type {CountTokensOptions, CountTokensResult, ModelId, ModelSelection, TokenizeResult} from './lib/api.js'",
    '',
    'export declare const isModelLoaded: (modelId: ModelId) => boolean',
    'export declare const getLoadedModelIds: () => Array<ModelId>',
    'export declare const loadModel: (modelId: ModelId) => Promise<ModelId>',
    'export declare const loadModels: (model?: ModelSelection) => Promise<Array<ModelId>>',
    '',
  ]
  const allDeclarationLines = [
    "export {countTokens, getLoadedModelIds, isModelLoaded, loadModel, loadModels, modelIds, models, tokenize} from './main.js'",
    "export {default} from './main.js'",
    "export type {CountTokensOptions, CountTokensResult, ModelId, ModelSelection, TokenizeResult} from './main.js'",
    '',
  ]
  await Bun.write(path.join(distFolder, 'main.d.ts'), mainDeclarationLines.join('\n'))
  await Bun.write(path.join(distFolder, 'all.d.ts'), allDeclarationLines.join('\n'))
}
const writePackageJson = async (rootPackage: RootPackageJson) => {
  const repositoryUrl = normalizeRepositoryUrl(rootPackage.repository)
  const homepage = rootPackage.homepage || (repositoryUrl ? `${repositoryUrl}#readme` : undefined)
  const bugs = rootPackage.bugs || (repositoryUrl ? {url: `${repositoryUrl}/issues`} : undefined)
  const outputPackage: Record<string, unknown> = {
    name: rootPackage.name,
    version: rootPackage.version,
    type: 'module',
  }
  if (rootPackage.description) {
    outputPackage.description = rootPackage.description
  }
  if (rootPackage.keywords) {
    outputPackage.keywords = rootPackage.keywords
  }
  if (rootPackage.author) {
    outputPackage.author = rootPackage.author
  }
  if (rootPackage.funding) {
    outputPackage.funding = rootPackage.funding
  }
  if (rootPackage.repository) {
    outputPackage.repository = rootPackage.repository
  }
  if (homepage) {
    outputPackage.homepage = homepage
  }
  if (bugs) {
    outputPackage.bugs = bugs
  }
  if (rootPackage.license) {
    outputPackage.license = rootPackage.license
  }
  outputPackage.exports = {
    '.': {
      types: './all.d.ts',
      import: './all.js',
      default: './all.js',
    },
    './browser': {
      types: './main.d.ts',
      import: './main.js',
      default: './main.js',
    },
    './browser/all': {
      types: './all.d.ts',
      import: './all.js',
      default: './all.js',
    },
  }
  outputPackage.types = './all.d.ts'
  await Bun.write(path.join(distFolder, 'package.json'), `${JSON.stringify(outputPackage, null, 2)}\n`)
}
if (!await Bun.file(generatedAssetsIndexFile).exists()) {
  throw new Error(`Missing generated tokenizer assets at ${JSON.stringify(toForwardSlashes(generatedAssetsIndexFile))}. Run “bun run fetch” first.`)
}
const rootPackage = await Bun.file(packageJsonFile).json() as RootPackageJson
await fs.rm(distFolder, {
  force: true,
  recursive: true,
})
await fs.ensureDir(distFolder)
await runCommand([bunExecutable, 'x', 'rolldown', '--config', configFile], 'Rolldown build')
await rewriteWasmAssetReferences()
await runCommand([bunExecutable, 'x', 'tsc', '--project', declarationConfigFile], 'TypeScript declaration build')
await rewriteDeclarationImports()
await writeEntryDeclarations()
await writePackageJson(rootPackage)
await copyPreparedTextFile(['README.md', 'readme.md'], 'README.md', content => prepareDistributionReadme(content, rootPackage.name))
await copyPreparedTextFile(['LICENSE', 'LICENSE.txt', 'license.txt'], 'LICENSE')
console.log(`Built browser distribution package into ${toForwardSlashes(distFolder)}.`)
