/**
 * Has the base rules for api lint
 * @constant
 * @example
 *    // eslint.config.mjs
 *    import { eslintBaseRules } from './src/config/lint/index.mjs';
 *
 *    export default {
 *        ...
 *        rules: {
 *            ...eslintBaseRules
 *            // some other rules
 *        },
 *        ...
 *    }
 */
const eslintBaseRules = {
  semi: ['error', 'never'],
  'no-else-return': 'error',
  'space-in-parens': ['error', 'never'],
  'no-trailing-spaces': 'error',
  'key-spacing': [
    'error',
    {
      beforeColon: false,
      afterColon: true,
      mode: 'strict'
    }
  ],
  'keyword-spacing': [
    'error',
    {
      after: true,
      before: true
    }
  ],
  'space-before-blocks': ['error', 'always']
}

/**
 * Has the rules for import/order plugin lint
 * @constant
 * @example
 *     // eslint.config.mjs
 *    import { eslintImportOrderRules } from './src/config/lint/index.mjs';
 *
 *    export default {
 *        ...
 *        rules: {
 *            // some other rules
 *            ...eslintImportOrderRules
 *            // some other rules
 *        },
 *        ...
 *    }
 */
const eslintImportOrderRules = {
  'import-x/order': [
    'error',
    {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling'],
        'index'
      ],
      pathGroups: [
        {
          pattern: 'node:*',
          group: 'builtin',
          position: 'before'
        },
        {
          pattern: '@/**',
          group: 'internal',
          position: 'before'
        }
      ],
      pathGroupsExcludedImportTypes: [],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }
  ]
}

/**
 * Has the rules for node plugin lint
 * @constant
 * @example
 *     // eslint.config.mjs
 *    import { eslintNodeRules } from './src/config/lint/index.mjs';
 *
 *    export default {
 *        ...
 *        rules: {
 *            // some other rules
 *            ...eslintNodeRules
 *            // some other rules
 *        },
 *        ...
 *    }
 */
const eslintNodeRules = {
  // 'node/no-missing-import': [
  //   'error',
  //   {
  //     resolvePaths: [path.resolve(__dirname, '../../src')],
  //     tryExtensions: ['.ts', '.js', '.json']
  //   }
  // ],
  'node/prefer-global/buffer': ['error', 'always'],
  'node/prefer-global/console': ['error', 'always'],
  'node/prefer-global/process': ['error', 'always'],
  'node/prefer-global/url-search-params': ['error', 'always'],
  'node/prefer-global/url': ['error', 'always'],
  'node/prefer-promises/dns': 'warn',
  'node/prefer-promises/fs': 'warn'
}

/**
 * Has the rules for typescript-eslint plugin lint
 * @constant
 * @example
 *     // eslint.config.mjs
 *    import { typescriptEslintRules } from './src/config/lint/index.mjs';
 *
 *    export default {
 *        ...
 *        rules: {
 *            // some other rules
 *            ...typescriptEslintRules
 *            // some other rules
 *        },
 *        ...
 *    }
 */
const typescriptEslintRules = {
  '@typescript-eslint/ban-ts-comment': 'off',
  '@typescript-eslint/explicit-function-return-type': 'warn',
  '@typescript-eslint/explicit-module-boundary-types': 'warn',
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'interface',
      format: ['PascalCase'],
      custom: { regex: '^I[A-Z]', match: false }
    }
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-var-requires': 'error',
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      vars: 'all',
      args: 'all'
    }
  ]
}

export {
  eslintBaseRules,
  eslintImportOrderRules,
  eslintNodeRules,
  typescriptEslintRules
}
