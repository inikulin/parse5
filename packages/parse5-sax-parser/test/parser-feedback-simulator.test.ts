import { fileURLToPath } from 'node:url';
import { it, assert } from 'vitest';
import { generateTokenizationTests } from 'parse5-test-utils/utils/generate-tokenization-tests.js';
import { ParserFeedbackSimulator } from '../lib/parser-feedback-simulator.js';

const feedbackPath = fileURLToPath(new URL('../../../test/data/parser-feedback', import.meta.url));

generateTokenizationTests(
    'ParserFeedbackSimulator',
    feedbackPath,
    (handler) => new ParserFeedbackSimulator({}, handler).tokenizer,
);

it('does constant work per namespace push and pop', () => {
    const noop = (): void => {};
    const simulator = new ParserFeedbackSimulator(
        {},
        {
            onStartTag: noop,
            onEndTag: noop,
            onCharacter: noop,
            onWhitespaceCharacter: noop,
            onNullCharacter: noop,
            onComment: noop,
            onDoctype: noop,
            onEof: noop,
        },
    );
    let writes = 0;
    const stack = Reflect.get(simulator, 'namespaceStack') as unknown[];
    Reflect.set(
        simulator,
        'namespaceStack',
        new Proxy(stack, {
            set(target, key, value): boolean {
                writes++;
                return Reflect.set(target, key, value);
            },
        }),
    );
    simulator.tokenizer.write('<svg><foreignObject>'.repeat(400) + '</foreignObject></svg>'.repeat(400), true);
    assert.isBelow(writes, 400 * 10);
});
