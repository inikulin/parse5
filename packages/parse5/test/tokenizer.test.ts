import * as assert from 'node:assert';
import * as parse5 from '../lib/index.js';
import { Tokenizer } from '../lib/tokenizer/index.js';
import { Mixin } from '../lib/utils/mixin.js';
import { ErrorReportingTokenizerMixin } from '../lib/extensions/error-reporting/tokenizer-mixin.js';
import { generateTokenizationTests } from '../../../test/utils/generate-tokenization-tests.js';
import type { ParserError } from './../lib/extensions/error-reporting/mixin-base';

const dataPath = new URL('../../../test/data/html5lib-tests/tokenizer', import.meta.url);

type Results = { errors: { code: string; line: number; col: number }[] };

generateTokenizationTests('tokenizer', 'Tokenizer', dataPath.pathname, ({ errors }: Results) => {
    const tokenizer = new Tokenizer();

    Mixin.install(tokenizer, ErrorReportingTokenizerMixin, {
        onParseError(err: ParserError) {
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
        const document: any = parse5.parse('<!--<<-->');
        assert.equal(document.childNodes[0].data, '<<');
    });
});
