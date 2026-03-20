import path from 'node:path'
import { fileURLToPath } from 'node:url'

import typescriptEslintEslintPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import { fixupPluginRules } from '@eslint/compat'
import globals from 'globals'
import importPlugin from 'eslint-plugin-import-x'
import nodePlugin from 'eslint-plugin-node'

import {
  eslintBaseRules,
  eslintImportOrderRules,
  eslintNodeRules,
  typescriptEslintRules
} from './config/linter/index.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const tsFiles = ['{src,tests}/**/*.ts']

const languageOptions = {
  globals: {
    ...globals.node,
    ...globals.jest
  },
  ecmaVersion: 2023,
  sourceType: 'module'
}

const customTypescriptConfig = {
  files: tsFiles,
  plugins: {
    '@typescript-eslint': typescriptEslintEslintPlugin,
    'import-x': importPlugin,
    node: fixupPluginRules(nodePlugin)
  },
  languageOptions: {
    ...languageOptions,
    parser: tsParser,
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: __dirname
    }
  },
  settings: {
    'import-x/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: path.resolve(__dirname, 'tsconfig.json')
      },
      node: {
        paths: [path.resolve(__dirname, 'src')],
        extensions: ['.js', '.ts', '.d.ts']
      }
    },
    'import-x/parsers': {
      '@typescript-eslint/parser': ['.ts', '.d.ts']
    }
  },
  rules: {
    ...eslintBaseRules,
    ...eslintImportOrderRules,
    ...eslintNodeRules,
    ...typescriptEslintRules
  }
}

const recommendedTypeScriptConfigs = [
  {
    files: tsFiles,
    plugins: {
      '@typescript-eslint': typescriptEslintEslintPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname
      }
    },
    rules: {
      ...typescriptEslintEslintPlugin.configs.recommended.rules,
      ...typescriptEslintEslintPlugin.configs.stylistic.rules
    }
  }
]

export default [
  {
    ignores: ['**/.eslintrc.cjs', 'docs/*', 'build/*', 'lib/*', 'dist/*']
  },
  ...recommendedTypeScriptConfigs,
  customTypescriptConfig
]
