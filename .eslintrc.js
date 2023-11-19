module.exports = {
  env: {
    browser: true,
    es6: true
  },
  extends: [
    'plugin:react/recommended',
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  plugins: [
    'react',
    '@typescript-eslint'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    camelcase: 'off',
    'comma-dangle': 'off',
    'dot-notation': 'off',
    'lines-between-class-members': 'off',
    'multiline-ternary': 'off',
    'no-unused-vars': 'off',
    'no-useless-constructor': 'off',
    'object-curly-spacing': 'off',
    'prefer-const': 'off',
    'react/display-name': 'off',
    'space-before-function-paren': 'off'
  }
}
