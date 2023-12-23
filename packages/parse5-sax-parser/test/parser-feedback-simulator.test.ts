import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

const feedbackPath = new URL('../../../test/data/parser-feedback', import.meta.url);

generateTokenizationTests(
    'ParserFeedbackSimulator',
    feedbackPath.pathname,
    (handler) => new ParserFeedbackSimulator({}, handler).tokenizer,
);
