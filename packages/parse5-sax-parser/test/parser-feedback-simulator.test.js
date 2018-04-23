const path = require('path');
const Tokenizer = require('parse5/lib/tokenizer');
const generateTokenizationTests = require('../../../test/utils/generate-tokenization-tests');
const ParserFeedbackSimulator = require('../lib/parser-feedback-simulator');

generateTokenizationTests(
    exports,
    'ParserFeedbackSimulator',
    path.join(__dirname, '../../../test/data/parser-feedback'),
    () => {
        const tokenizer = new Tokenizer();
        const feedbackSimulator = new ParserFeedbackSimulator(tokenizer);

        return { tokenizer, getNextToken: () => feedbackSimulator.getNextToken() };
    }
);
