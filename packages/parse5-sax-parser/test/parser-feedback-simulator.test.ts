import { Tokenizer } from 'parse5/lib/tokenizer/index.js';
import { generateTokenizationTests } from '../../../test/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

const feedbackPath = new URL('../../../test/data/parser-feedback', import.meta.url);

generateTokenizationTests('ParserFeedbackSimulator', 'ParserFeedbackSimulator', feedbackPath.pathname, () => {
    const tokenizer = new Tokenizer();
    const feedbackSimulator = new ParserFeedbackSimulator(tokenizer);

    return { tokenizer, getNextToken: () => feedbackSimulator.getNextToken() };
});
