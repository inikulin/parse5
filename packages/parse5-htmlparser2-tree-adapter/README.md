<p align="center">
    <a href="https://github.com/inikulin/parse5">
        <img src="https://raw.github.com/inikulin/parse5/master/media/logo.png" alt="parse5" />
    </a>
</p>

<div align="center">
<h1>parse5-htmlparser2-tree-adapter</h1>
<i><b><a href="https://github.com/fb55/htmlparser2">htmlparser2</a> tree adapter for <a href="https://github.com/inikulin/parse5">parse5</a>.</b></i>
</div>
<br>

<div align="center">
<code>npm install --save parse5-htmlparser2-tree-adapter</code>
</div>
<br>

<p align="center">
  📖 <a href="https://parse5.js.org/modules/parse5-htmlparser2-tree-adapter.html"><b>Documentation</b></a> 📖
</p>

## Usage

Use this adapter with `parse5` (`npm install parse5`) to produce
[htmlparser2](https://github.com/fb55/htmlparser2)-compatible nodes.

Save the following as an `.mjs` file and run it with Node.js.

```js
import { parse } from 'parse5';
import { adapter } from 'parse5-htmlparser2-tree-adapter';

const document = parse('<p>Hello, world!</p>', { treeAdapter: adapter });
console.log(document.children[0].name); // html
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
