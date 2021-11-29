import * as parse5 from '../index.js';
import { Tokenizer } from './index.js';
import { generateTokenizationTests } from '@parse5/test-utils/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../test-utils/data/html5lib-tests/tokenizer', import.meta.url);

generateTokenizationTests('tokenizer', 'Tokenizer', dataPath.pathname, ({ errors }) => {
    const tokenizer = new Tokenizer({
        sourceCodeLocationInfo: true,
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
