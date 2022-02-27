import * as parse5 from 'parse5';
import { Tokenizer } from 'parse5/dist/tokenizer/index.js';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);
const tokenizerOpts = {
    sourceCodeLocationInfo: true,
};

generateTokenizationTests(
    'tokenizer',
    'Tokenizer',
    dataPath.pathname,
    (handler) => new Tokenizer(tokenizerOpts, handler)
);

describe('tokenizer', () => {
    it('Regression - `<<` in comment parses correctly (GH-325)', () => {
        const document = parse5.parse('<!--<<-->');
        expect(document.childNodes[0]).toHaveProperty('data', '<<');
    });
});
