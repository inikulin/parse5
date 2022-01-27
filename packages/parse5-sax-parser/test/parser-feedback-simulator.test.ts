import { Token } from 'parse5/dist/common/token.js';
import { QueuedHandler } from 'parse5/dist/tokenizer/index.js';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

const feedbackPath = new URL('../../../test/data/parser-feedback', import.meta.url);

generateTokenizationTests('ParserFeedbackSimulator', 'ParserFeedbackSimulator', feedbackPath.pathname, () => {
    const handler = new QueuedHandler();
    const feedbackSimulator = new ParserFeedbackSimulator({}, handler);
    const { tokenizer } = feedbackSimulator;

    return { tokenizer, getNextToken: (): Token => handler.getNextToken(tokenizer) };
});
