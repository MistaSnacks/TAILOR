import next from 'eslint-config-next';

const config = [
  {
    ignores: ['**/.next/**', '**/node_modules/**'],
  },
  ...next,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@next/next/no-img-element': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@next/next/no-assign-module-variable': 'off',
    },
  },
];

export default config;

