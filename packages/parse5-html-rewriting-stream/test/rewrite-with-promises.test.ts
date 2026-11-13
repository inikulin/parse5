import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { describe, it } from 'vitest';
import { WritableStreamStub } from 'parse5-test-utils/utils/common.js';
import { AsyncTextRewriter } from '../examples/rewrite-with-promises.js';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

async function beforeCompletion(started: Promise<void>, completion: Promise<void>): Promise<void> {
    await Promise.race([
        started,
        completion.then(() => {
            throw new Error('The stream completed before the queued rewrite started');
        }),
    ]);
}

describe('Promise-based rewriting recipe', () => {
    it('keeps doctype, tags, comments and chunked raw text in order', async () => {
        const started = deferred<void>();
        const gate = deferred<string>();
        const calls: string[] = [];
        const rewriter = new AsyncTextRewriter((raw: string) => {
            calls.push(raw);
            if (calls.length === 1) {
                started.resolve();
                return gate.promise;
            }
            return Promise.resolve(raw);
        });
        const destination = new WritableStreamStub();
        const completion = pipeline(
            Readable.from(["<!doctype html><!--before--><p class='x'>alpha &amp; ", 'beta</p><!--after-->tail']),
            rewriter,
            destination,
        );

        try {
            await beforeCompletion(started.promise, completion);
            assert.equal(destination.writtenData, "<!doctype html><!--before--><p class='x'>");
            assert.deepEqual(calls, ['alpha &amp; beta']);
        } finally {
            gate.resolve('ALPHA &amp; beta');
        }

        await completion;
        assert.equal(
            destination.writtenData,
            "<!doctype html><!--before--><p class='x'>ALPHA &amp; beta</p><!--after-->tail",
        );
        assert.deepEqual(calls, ['alpha &amp; beta', 'tail']);
    });

    it('waits for trailing text emitted only during finalization', async () => {
        const started = deferred<void>();
        const gate = deferred<string>();
        const rewriter = new AsyncTextRewriter(() => {
            started.resolve();
            return gate.promise;
        });
        const destination = new WritableStreamStub();
        const completion = pipeline(Readable.from(['tail']), rewriter, destination);
        let completed = false;
        completion.then(
            () => {
                completed = true;
            },
            () => {
                completed = true;
            },
        );

        try {
            await beforeCompletion(started.promise, completion);
            assert.equal(completed, false);
            assert.equal(destination.writtenData, '');
        } finally {
            gate.resolve('rewritten tail');
        }

        await completion;
        assert.equal(destination.writtenData, 'rewritten tail');
    });

    for (const synchronous of [false, true]) {
        it(`rejects and destroys on a ${synchronous ? 'thrown error' : 'rejected Promise'}`, async () => {
            const failure = new Error('rewrite failed');
            const calls: string[] = [];
            const rewriter = new AsyncTextRewriter((raw: string) => {
                calls.push(raw);
                if (synchronous) {
                    throw failure;
                }
                return Promise.reject(failure);
            });
            const destination = new WritableStreamStub();

            await assert.rejects(
                pipeline(Readable.from(['<p>first</p><p>never</p>']), rewriter, destination),
                (error) => error === failure,
            );
            assert.deepEqual(calls, ['first']);
            assert.equal(rewriter.destroyed, true);
            assert.equal(destination.destroyed, true);
        });
    }

    for (const reason of [undefined, null, 0, 'denied']) {
        it(`turns rejection ${String(reason)} into a stream error`, async () => {
            const rewriter = new AsyncTextRewriter(() => Promise.reject(reason));
            await assert.rejects(pipeline(Readable.from(['tail']), rewriter, new WritableStreamStub()), {
                message: 'HTML rewriting rejected',
                cause: reason,
            });
        });
    }

    for (const result of [undefined, null, 42]) {
        it(`rejects a non-string result ${String(result)} instead of ending or dropping text`, async () => {
            const rewriter = new AsyncTextRewriter(() => Promise.resolve(result));
            await assert.rejects(pipeline(Readable.from(['tail']), rewriter, new WritableStreamStub()), {
                name: 'TypeError',
                message: 'The rewrite callback must return raw HTML as a string',
            });
        });
    }

    it('propagates destination errors through the ordinary pipeline', async () => {
        const failure = new Error('destination failed');
        const rewriter = new AsyncTextRewriter((raw: string) => Promise.resolve(raw));
        const destination = new Writable({
            write(_chunk, _encoding, callback): void {
                callback(failure);
            },
        });

        await assert.rejects(
            pipeline(Readable.from(['<p>text</p>']), rewriter, destination),
            (error) => error === failure,
        );
        assert.equal(rewriter.destroyed, true);
        assert.equal(destination.destroyed, true);
    });
});
