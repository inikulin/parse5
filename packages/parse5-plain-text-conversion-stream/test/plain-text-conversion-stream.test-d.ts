import { expectTypeOf, it } from 'vitest';
import { type DefaultTreeAdapterMap } from 'parse5';
import { adapter, type Htmlparser2TreeAdapterMap } from 'parse5-htmlparser2-tree-adapter';
import { PlainTextConversionStream } from '../lib/index.js';

it('uses default tree types without a custom adapter', () => {
    const stream = new PlainTextConversionStream();
    expectTypeOf(stream.document).toEqualTypeOf<DefaultTreeAdapterMap['document']>();
    expectTypeOf<PlainTextConversionStream['document']>().toEqualTypeOf<DefaultTreeAdapterMap['document']>();

    const streamWithOptions = new PlainTextConversionStream({ scriptingEnabled: false });
    expectTypeOf(streamWithOptions.document).toEqualTypeOf<DefaultTreeAdapterMap['document']>();
});

it('infers custom tree types from the adapter', () => {
    const stream = new PlainTextConversionStream({ treeAdapter: adapter });
    expectTypeOf(stream.document).toEqualTypeOf<Htmlparser2TreeAdapterMap['document']>();
});
