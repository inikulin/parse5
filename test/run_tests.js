var reporter = require('nodeunit').reporters.default;

process.chdir(__dirname);
reporter.run(['tokenizer_test.js']);

