# Class: ParserStream

Streaming HTML parser with scripting support. A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).

*__example__*:

```js
const ParserStream = require('parse5-parser-stream');
const http = require('http');

// Fetch the page content and obtain it's <head> node
http.get('http://inikulin.github.io/parse5/', res => {
    const parser = new ParserStream();

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

See: [writable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable).

### Events

* [on("script")](#on_script)

Also see: [writable stream API](https://nodejs.org/api/stream.html#stream_class_stream_writable).

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

## Events

<a id="on_script"></a>

###  on("script")

▸ **on**(event: *"script"*, listener: *`function`*): `this`

Raised when parser encounters a `<script>` element. If this event has listeners, parsing will be suspended once it is emitted. So, if `<script>` has the `src` attribute, you can fetch it, execute and then resume parsing just like browsers do.

*__example__*:

```js
const ParserStream = require('parse5-parser-stream');
const http = require('http');

const parser = new ParserStream();

parser.on('script', (scriptElement, documentWrite, resume) => {
    const src = scriptElement.attrs.find(({ name }) => name === 'src').value;

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
| listener | `function` (see below) |

**Returns:** `this`

**listener:** (scriptElement: *Element*, documentWrite: *`function`*, resume: *`function`*): *`void`*

| Param | Type | Description |
| ------ | ------ | ------ |
| scriptElement | Element |  The script element that caused the event. |
| documentWrite | `function (html: string): void` |  Write additional html at the current parsing position. Suitable for implementing the DOM document.write and document.writeln methods. |
| resume | `function` | Resumes parsing.

___
