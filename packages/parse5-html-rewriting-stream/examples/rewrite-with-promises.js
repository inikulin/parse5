import { Readable, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL } from 'node:url';
import { RewritingStream } from 'parse5-html-rewriting-stream';

// This recipe is a local subclass, leaving the package's synchronous events
// unchanged. The callback receives and returns raw HTML text.
export class AsyncTextRewriter extends RewritingStream {
    #queue = Promise.resolve();

    constructor(rewriteText) {
        super();

        this.on('text', (_token, raw) => this.#defer(() => rewriteText(raw)));

        // Otherwise these tokens would pass through synchronously and overtake
        // the text still waiting for its Promise.
        for (const event of ['startTag', 'endTag', 'doctype', 'comment']) {
            this.on(event, (_token, raw) => this.#defer(() => raw));
        }
    }

    #defer(rewrite) {
        this.#queue = this.#queue.then(async () => {
            if (this.destroyed) {
                return;
            }

            const raw = await rewrite();

            if (!this.destroyed) {
                if (typeof raw !== 'string') {
                    throw new TypeError('The rewrite callback must return raw HTML as a string');
                }
                this.emitRaw(raw);
            }
        });
    }

    #afterQueue(callback) {
        return (error, data) => {
            if (error) {
                callback(error);
            } else {
                this.#queue.then(
                    () => callback(null, data),
                    (error_) =>
                        callback(
                            error_ instanceof Error ? error_ : new Error('HTML rewriting rejected', { cause: error_ }),
                        ),
                );
            }
        };
    }

    _transform(chunk, encoding, callback) {
        super._transform(chunk, encoding, this.#afterQueue(callback));
    }

    _final(callback) {
        // The SAX parser may emit its last text token only while finalizing.
        // Wait for that token's queued work before allowing the readable EOF.
        super._final(this.#afterQueue(callback));
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const rewriter = new AsyncTextRewriter(async (raw) => {
        await Promise.resolve();
        return raw.replaceAll('world', 'universe');
    });
    let output = '';
    const destination = new Writable({
        write(chunk, _encoding, callback) {
            output += chunk;
            callback();
        },
    });

    await pipeline(Readable.from(['<!doctype html><p>Hello, world!</p>', 'tail']), rewriter, destination);
    process.stdout.write(`${output}\n`);
}
