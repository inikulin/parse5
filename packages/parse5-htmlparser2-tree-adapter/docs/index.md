# parse5-htmlparser2-tree-adapter

## Usage

```js
const parse5 = require('parse5');
const htmlparser2Adapter = require('parse5-htmlparser2-tree-adapter');

const document = parse5.parse('<div></div>', { treeAdapter: htmlparser2Adapter });
```

## List of tree interfaces produced by htmlparser2 [tree adapter](../../parse5/docs/tree-adapter/interface.md)

* [CommentNode](comment-node.md)
* [Document](document.md)
* [DocumentFragment](document-fragment.md)
* [DocumentType](document-type.md)
* [Element](element.md)
* [TextNode](text-node.md)

---

