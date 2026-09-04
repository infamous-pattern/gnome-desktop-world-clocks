export default [{
    files: ['**/*.js'],
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: {global: 'readonly', console: 'readonly', print: 'readonly', TextDecoder: 'readonly'},
    },
    rules: {
        'no-undef': 'error',
        'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_'}],
        'no-unreachable': 'error',
        'no-dupe-keys': 'error',
        'eqeqeq': 'error',
        'max-len': ['error', {code: 200}],
    },
}];
