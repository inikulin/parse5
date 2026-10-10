<p align="center">
    <a href="https://github.com/inikulin/parse5">
        <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" />
    </a>
</p>

<div align="center">
<h1>parse5-sax-parser</h1>
<i><b>Streaming <a href="https://en.wikipedia.org/wiki/Simple_API_for_XML">SAX</a>-style HTML parser.</b></i>
</div>
<br>

<div align="center">
<code>npm install --save parse5-sax-parser</code>
</div>
<br>

<p align="center">
  📖 <a href="https://parse5.js.org/modules/parse5-sax-parser.html"><b>Documentation</b></a> 📖
</p>

## Usage

Handle HTML tokens as they arrive, without building a document tree.

Save the following as an `.mjs` file and run it with Node.js.

```js
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { SAXParser } from 'parse5-sax-parser';

const parser = new SAXParser();
const text = [];
parser.on('text', (token) => text.push(token.text));
await pipeline(Readable.from(['<p>Hello, <b>world!</b></p>']), parser);
console.log(text.join('')); // Hello, world!
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
