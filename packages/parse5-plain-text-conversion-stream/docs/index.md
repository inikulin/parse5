# Class: PlainTextConversionStream

Converts plain text files into HTML document as required by [HTML specification](https://html.spec.whatwg.org/#read-text). A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).

*__example__*:

```js
const PlainTextConversionStream = require('parse5-plain-text-conversion-stream');
const fs = require('fs');

const file = fs.createReadStream('war_and_peace.txt');
const converter = new PlainTextConversionStream();

converter.once('finish', () => {
    console.log(converter.document.childNodes[1].childNodes[0].tagName); //> 'head'
});

file.pipe(converter);
```

### Constructors

* [constructor](#constructor)

### Properties

* [document](#document)

### Methods and events

See: [writable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable).

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new PlainTextConversionStream**(options?: *[ParserOptions](../../parse5/parser-options.md)*): [PlainTextConversionStream]()

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| `Optional` options | [ParserOptions](../../parse5/parser-options.md) |  Parsing options. |

**Returns:** [PlainTextConversionStream]()

___

## Properties

<a id="document"></a>

###  document

**● document**: *Document*

The resulting document node.

___
