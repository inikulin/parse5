module.exports = {
    env: {
        es6: true,
        node: true
    },
    extends: ['eslint:recommended', 'prettier'],
    plugins: ['prettier'],
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'error',
        curly: ['error', 'all']
    },
    parserOptions: {
        ecmaVersion: 6
    }
};
