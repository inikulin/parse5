import assert from 'assert';
import * as parse5 from '../lib/index.js';
import { Tokenizer } from '../lib/tokenizer/index.js';
import { Mixin } from '../lib/utils/mixin.js';
import { ErrorReportingTokenizerMixin } from '../lib/extensions/error-reporting/tokenizer-mixin.js';
import { generateTokenizationTests } from '../../../test/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../test/data/html5lib-tests/tokenizer', import.meta.url);

generateTokenizationTests('tokenizer', 'Tokenizer', dataPath.pathname, ({ errors }) => {
    const tokenizer = new Tokenizer();

    Mixin.install(tokenizer, ErrorReportingTokenizerMixin, {
        onParseError(err) {
            errors.push({
                code: err.code,
                line: err.startLine,
                col: err.startCol,
            });
        },
    });

    return { tokenizer, getNextToken: () => tokenizer.getNextToken() };
});

suite('tokenizer', () => {
    test('Regression - `<<` in comment parses correctly (GH-325)', () => {
        const document = parse5.parse('<!--<<-->');
        assert.equal(document.childNodes[0].data, '<<');
    });
});
