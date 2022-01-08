import { Tokenizer } from 'parse5/dist/tokenizer/index.js';
import type { Token } from 'parse5/dist/common/token.js';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

const feedbackPath = new URL('../../../test/data/parser-feedback', import.meta.url);

generateTokenizationTests('ParserFeedbackSimulator', 'ParserFeedbackSimulator', feedbackPath.pathname, () => {
    const tokenizer = new Tokenizer({});
    const feedbackSimulator = new ParserFeedbackSimulator(tokenizer);

    return { tokenizer, getNextToken: (): Token => feedbackSimulator.getNextToken() };
});
