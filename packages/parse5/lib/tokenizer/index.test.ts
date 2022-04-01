import { Tokenizer } from 'parse5';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';

const dataPath = new URL('../../../../test/data/html5lib-tests/tokenizer', import.meta.url);
const tokenizerOpts = {
    sourceCodeLocationInfo: true,
};

generateTokenizationTests('Tokenizer', dataPath.pathname, (handler) => new Tokenizer(tokenizerOpts, handler));
