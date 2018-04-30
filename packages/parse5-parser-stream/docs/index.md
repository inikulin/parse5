# Class: ParserStream

Streaming HTML parser with scripting support. A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).

*__example__*:

```js
const parse5 = require('parse5');
const http = require('http');

// Fetch the page content and obtain it's <head> node
http.get('http://inikulin.github.io/parse5/', res => {
    const parser = new parse5.ParserStream();

    parser.once('finish', () => {
        console.log(parser.document.childNodes[1].childNodes[0].tagName); //> 'head'
    });

    res.pipe(parser);
});
```

### Constructors

* [constructor](#constructor)

### Properties

* [document](#document)

### Methods

* [end](#end)
* [on('script')](#on)
* [write](#write)

---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new ParserStream**(options?: *[ParserOptions](../../parse5/docs/options/parser-options.md)*): [ParserStream]()

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| `Optional` options | [ParserOptions](../../parse5/docs/options/parser-options.md) |  Parsing options. |

**Returns:** [ParserStream]()

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

<a id="on"></a>

###  on

▸ **on**(event: *"script"*, listener: *`function`*): `this`

Raised then parser encounters a `<script>` element. If this event has listeners, parsing will be suspended once it is emitted. So, if `<script>` has the `src` attribute, you can fetch it, execute and then resume parsing just like browsers do.

*__example__*:
```js
const parse = require('parse5');
const http = require('http');

const parser = new parse5.ParserStream();

parser.on('script', (scriptElement, documentWrite, resume) => {
    const src = scriptElement.attrs.find({ name } => name === 'src').value;

    http.get(src, res => {
        // Fetch the script content, execute it with DOM built around `parser.document` and
        // `document.write` implemented using `documentWrite`.
        ...
        // Then resume parsing.
        resume();
    });
});

parser.end('<script src="example.com/script.js"></script>');
```

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "script" |
| listener | `function` |

**Returns:** `this`

WritableStream events

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | `string` |
| listener | `Function` |

**Returns:** `this`

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
