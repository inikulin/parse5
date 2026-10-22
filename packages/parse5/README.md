<p align="center">
    <a href="https://github.com/inikulin/parse5">
        <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" />
    </a>
</p>

<div align="center">
<h1>parse5</h1>
<i><b>HTML parser and serializer.</b></i>
</div>
<br>

<div align="center">
<code>npm install --save parse5</code>
</div>
<br>

<p align="center">
  📖 <a href="https://parse5.js.org/modules/parse5.html"><b>Documentation</b></a> 📖
</p>

## Usage

Parse HTML into a document tree and serialize it back to HTML.

```js
import { parse, serialize } from 'parse5';

const document = parse('<p>Hello, world!</p>');
console.log(serialize(document));
// <html><head></head><body><p>Hello, world!</p></body></html>
```

---

<p align="center">
  <a href="https://github.com/inikulin/parse5/tree/master/docs/list-of-packages.md">List of parse5 toolset packages</a>
</p>

<p align="center">
    <a href="https://github.com/inikulin/parse5">GitHub</a>
</p>

<p align="center">
  <a href="http://astexplorer.net/#/1CHlCXc4n4">Online playground</a>
</p>

<p align="center">
    <a href="https://github.com/inikulin/parse5/releases">Changelog</a>
</p>
