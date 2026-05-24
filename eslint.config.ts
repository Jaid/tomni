import type {Linter} from 'eslint'

import {makeEslintConfig} from 'eslint-config-jaid'

const eslintConfig: Array<Linter.Config> = [
  {
    ignores: ['dist/**', 'private/**', 'temp/**'],
  },
  ...makeEslintConfig(),
]

export default eslintConfig
