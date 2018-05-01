# Class: SerializerStream

Streaming AST node to an HTML serializer. A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).

*__example__*:

```js
const parse5 = require('parse5');
const SerializerStream = require('parse5-serializer-stream');
const fs = require('fs');

const file = fs.createWriteStream('/home/index.html');

// Serializes the parsed document to HTML and writes it to the file.
const document = parse5.parse('<body>Who is John Galt?</body>');
const serializer = new SerializerStream(document);

serializer.pipe(file);
```

### Constructors

* [constructor](#constructor)

### Methods and events

See: [readable stream API](https://nodejs.org/api/stream.html#stream_class_stream_readable).

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new SerializerStream**(node: *Node*, options?: *[SerializerOptions](../../parse5/docs/options/serializer-options.md)*): [SerializerStream]()

Streaming AST node to an HTML serializer. A readable stream.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node to serialize. |
| `Optional` options | [SerializerOptions](../../parse5/docs/options/serializer-options.md) |  Serialization options. |

**Returns:** [SerializerStream]()

___
