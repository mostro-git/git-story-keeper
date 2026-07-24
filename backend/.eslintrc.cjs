module.exports = {
  env: { node: true, commonjs: true, es2022: true },
  parserOptions: { ecmaVersion: 2022 },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': 'off',
  },
};
