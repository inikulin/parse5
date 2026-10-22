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

Save the following as an `.mjs` file and run it with Node.js.

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
