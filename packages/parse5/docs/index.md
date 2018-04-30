# parse5

> **NOTE:** By default all functions operate with [tree format](tree-adapter/default/interface-list.md) produced
> by the default tree adapter. Tree format can be changed by providing custom [tree adapter](tree-adapter/interface.md) implementation.

### Functions

* [parse](#parse)
* [parseFragment](#parsefragment)
* [serialize](#serialize)

<a id="parse"></a>

### parse

▸ **parse**(html: _`string`_, options?: _[ParserOptions](options/parser-options.md)_): Document

Parses an HTML string.

_**example**_:

```js
const parse5 = require('parse5');

const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');

console.log(document.childNodes[1].tagName); //> 'html'
```

**Parameters:**

| Param              | Type                                                                                                           | Description        |
| ------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------ |
| html               | `string`                                                                                                       | Input HTML string. |
| `Optional` options | [ParserOptions](options/parser-options.md) | Parsing options.   |

**Returns:** Document

---

<a id="parsefragment"></a>

### parseFragment

▸ **parseFragment**(fragmentContext: _Element_, html: _`string`_, options?: _[ParserOptions](options/parser-options.md)_): DocumentFragment

▸ **parseFragment**(html: _`string`_, options?: _[ParserOptions](options/parser-options.md)_): DocumentFragment

Parses an HTML fragment.

_**example**_:

```js
const parse5 = require('parse5');

const documentFragment = parse5.parseFragment('<table></table>');

console.log(documentFragment.childNodes[0].tagName); //> 'table'

// Parses the html fragment in the context of the parsed <table> element.
const trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');

console.log(trFragment.childNodes[0].childNodes[0].tagName); //> 'td'
```

**Parameters:**

| Param                      | Type                                                                                                           | Description                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Optional` fragmentContext | Element                                                                                                        | Parsing context element. If specified, given fragment will be parsed as if it was set to the context element's \`innerHTML\` property. |
| html                       | `string`                                                                                                       | Input HTML fragment string.                                                                                                            |
| `Optional` options         | [ParserOptions](options/parser-options.md) | Parsing options.                                                                                                                       |

**Returns:** DocumentFragment

---

<a id="serialize"></a>

### serialize

▸ **serialize**(node: _Node_, options?: _[SerializerOptions](options/serializer-options.md)_): `string`

Serializes an AST node to an HTML string.

_**example**_:

```js
const parse5 = require('parse5');

const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');

// Serializes a document.
const html = parse5.serialize(document);

// Serializes the <html> element content.
const str = parse5.serialize(document.childNodes[1]);

console.log(str); //> '<head></head><body>Hi there!</body>'
```

**Parameters:**

| Param              | Type                                                                                                                   | Description            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| node               | Node                                                                                                                   | Node to serialize.     |
| `Optional` options | [SerializerOptions](options/serializer-options.md) | Serialization options. |

**Returns:** `string`

---
