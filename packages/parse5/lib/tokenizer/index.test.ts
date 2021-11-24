import * as parse5 from '../index.js';
import { Tokenizer } from './index.js';
import { Mixin } from '../utils/mixin.js';
import { ErrorReportingTokenizerMixin } from '../extensions/error-reporting/tokenizer-mixin.js';
import { generateTokenizationTests } from '../../../../test/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);

generateTokenizationTests('tokenizer', 'Tokenizer', dataPath.pathname, ({ errors }) => {
    const tokenizer = new Tokenizer({ sourceCodeLocationInfo: true });

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

describe('tokenizer', () => {
    it('Regression - `<<` in comment parses correctly (GH-325)', () => {
        const document = parse5.parse('<!--<<-->');
        expect(document.childNodes[0]).toHaveProperty('data', '<<');
    });
});
