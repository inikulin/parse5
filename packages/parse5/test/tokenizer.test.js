'use strict';

const path = require('path');
const Tokenizer = require('../lib/tokenizer');
const Mixin = require('../lib/utils/mixin');
const ErrorReportingTokenizerMixin = require('../lib/extensions/error-reporting/tokenizer-mixin');
const generateTokenizationTests = require('../../../test/utils/generate-tokenization-tests');

generateTokenizationTests(
    exports,
    'Tokenizer',
    path.join(__dirname, '../../../test/data/html5lib-tests/tokenizer'),
    ({ errors }) => {
        const tokenizer = new Tokenizer();

        Mixin.install(tokenizer, ErrorReportingTokenizerMixin, {
            onParseError(err) {
                errors.push({
                    code: err.code,
                    line: err.startLine,
                    col: err.startCol
                });
            }
        });

        return { tokenizer, getNextToken: () => tokenizer.getNextToken() };
    }
);
