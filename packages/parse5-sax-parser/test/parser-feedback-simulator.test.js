import * as path from 'path';
import { Tokenizer } from 'parse5/lib/tokenizer/index.js';
import { generateTokenizationTests } from '../../../test/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

generateTokenizationTests(
    'ParserFeedbackSimulator',
    'ParserFeedbackSimulator',
    path.join(__dirname, '../../../test/data/parser-feedback'),
    () => {
        const tokenizer = new Tokenizer();
        const feedbackSimulator = new ParserFeedbackSimulator(tokenizer);

        return { tokenizer, getNextToken: () => feedbackSimulator.getNextToken() };
    }
);
