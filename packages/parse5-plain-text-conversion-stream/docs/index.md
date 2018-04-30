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

### Methods

* [end](#end)
* [write](#write)

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

## Methods

<a id="end"></a>

###  end

▸ **end**(cb?: *`Function`*): `void`

▸ **end**(chunk: *`any`*, cb?: *`Function`*): `void`

▸ **end**(chunk: *`any`*, encoding?: *`string`*, cb?: *`Function`*): `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| `Optional` cb | `Function` |

**Returns:** `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` |
| `Optional` cb | `Function` |

**Returns:** `void`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` |
| `Optional` encoding | `string` |
| `Optional` cb | `Function` |

**Returns:** `void`

___
<a id="write"></a>

###  write

▸ **write**(chunk: *`any`*, cb?: *`Function`*): `boolean`

▸ **write**(chunk: *`any`*, encoding?: *`string`*, cb?: *`Function`*): `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` |
| `Optional` cb | `Function` |

**Returns:** `boolean`

**Parameters:**

| Param | Type |
| ------ | ------ |
| chunk | `any` |
| `Optional` encoding | `string` |
| `Optional` cb | `Function` |

**Returns:** `boolean`

___
