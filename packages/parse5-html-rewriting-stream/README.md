<p align="center">
    <a href="https://github.com/inikulin/parse5">
        <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" />
    </a>
</p>

<div align="center">
<h1>parse5-html-rewriting-stream</h1>
<i><b>Streaming HTML rewriter.</b></i>
</div>
<br>

<div align="center">
<code>npm install --save parse5-html-rewriting-stream</code>
</div>
<br>

<p align="center">
  📖 <a href="https://parse5.js.org/modules/parse5-html-rewriting-stream.html"><b>Documentation</b></a> 📖
</p>

## Usage

Modify HTML tokens while streaming the result. Tokens without a handler are
passed through unchanged; handlers must emit the replacement tokens.

```js
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { RewritingStream } from 'parse5-html-rewriting-stream';

const rewriter = new RewritingStream();
rewriter.on('text', (token) => rewriter.emitText({ text: token.text.toUpperCase() }));
let output = '';
rewriter.on('data', (chunk) => {
    output += chunk;
});
await pipeline(Readable.from(['<p>Hello, world!</p>']), rewriter);
console.log(output); // <p>HELLO, WORLD!</p>
```

## Rewriting with Promises

Event listeners run synchronously: returning a Promise from a `text` listener
does not delay the stream's completion. The [runnable Promise recipe](examples/rewrite-with-promises.js)
queues every token type so that tags, comments, and doctypes stay in order with
the text being rewritten. Its local subclass waits for the queue in the normal
transform and finalization callbacks, including trailing text emitted at EOF.
Rejected Promises and thrown errors reach the ordinary `pipeline` error handler.

From a repository checkout, run:

```sh
npm ci
npm run build
node packages/parse5-html-rewriting-stream/examples/rewrite-with-promises.js
# <!doctype html><p>Hello, universe!</p>tail
```

The example's text callback receives raw HTML, including the original entity
spellings, and returns raw HTML for `emitRaw`. It serializes the queued work for
each input chunk before accepting the next chunk. The stream events and package
exports keep their existing synchronous API.

---

<p align="center">
  <a href="https://github.com/inikulin/parse5/tree/master/docs/list-of-packages.md">List of parse5 toolset packages</a>
</p>

<p align="center">
    <a href="https://github.com/inikulin/parse5">GitHub</a>
</p>

<p align="center">
    <a href="https://github.com/inikulin/parse5/releases">Changelog</a>
</p>
