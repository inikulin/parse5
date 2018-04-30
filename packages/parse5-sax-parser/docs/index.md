# Class: SAXParser

Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML parser. A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) (which means you can pipe _through_ it, see example).

*__example__*:

```js
    const SAXParser = require('parse5-sax-parser');
    const http = require('http');
    const fs = require('fs');

    const file = fs.createWriteStream('/home/google.com.html');
    const parser = new SAXParser();

    parser.on('text', text => {
       // Handle page text content
       ...
    });

    http.get('http://google.com', res => {
       // SAXParser is the Transform stream, which means you can pipe
       // through it. So, you can analyze page content and, e.g., save it
       // to the file at the same time:
       res.pipe(parser).pipe(file);
    });
```

### Constructors

* [constructor](#constructor)


### Methods

* [end](#end)
* [stop](#stop)
* [write](#write)

### Events


---

## Constructors

<a id="constructor"></a>

###  constructor

⊕ **new SAXParser**(options?: *[SAXParserOptions](sax-parser-options.md)*): [SAXParser]()

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| `Optional` options | [SAXParserOptions](sax-parser-options.md) |  Parsing options. |

**Returns:** [SAXParser]()

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
<a id="stop"></a>

###  stop

▸ **stop**(): `void`

Stops parsing. Useful if you want the parser to stop consuming CPU time once you've obtained the desired info from the input stream. Doesn't prevent piping, so that data will flow through the parser as usual.

*__example__*:

```js
const SAXParser = require('parse5-sax-parser');
const http = require('http');
const fs = require('fs');

const file = fs.createWriteStream('google.com.html');
const parser = new SAXParser();

parser.on('doctype', (name, publicId, systemId) => {
    // Process doctype info ans stop parsing
    ...
    parser.stop();
});

http.get('http://google.com', res => {
    // Despite the fact that parser.stop() was called whole
    // content of the page will be written to the file
    res.pipe(parser).pipe(file);
});
```

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

## Events

<a id="on_starttag"></a>

###  on("startTag")

▸ **on**(event: *"startTag"*, listener: *`function`*): `this`

Raised when the parser encounters a start tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "startTag" |
| listener | `function` (see below) |

**Returns:** `this`

**listener:** (name: *`string`*, attrs: *Attribute*[], selfClosing: *`boolean`*, location?: *[StartTagLocation](../../parse5/docs/source-code-location/start-tag-location.md)*): `void`

| Param | Type | Description |
| ------ | ------ | ------ |
| name  |`string`|Tag name.|
|attrs|Attribute|List of attributes.|
|selfClosing|`boolean`|Indicates if the tag is self-closing.|
|`Optional` location|[StartTagLocation](../../parse5/docs/source-code-location/start-tag-location.md)|Start tag source code location info. Available if location info is enabled via [SAXParserOptions](sax-parser-options.md).|

___
<a id="on_endtag"></a>

###  on("endTag")

▸ **on**(event: *"endTag"*, listener: *`function`*): `this`

Raised then parser encounters an end tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "endTag" |
| listener | `function` (see below) |

**Returns:** `this`

**listener:** (name: *`string`*, location?: *[Location](../../parse5/docs/source-code-location/location.md)*): `void`

| Param | Type | Description |
| ------ | ------ | ------ |
|name|`string`|Tag name.|
|`Optional` location|[Location](../../parse5/docs/source-code-location/location.md)| End tag source code location info. Available if location info is enabled via [SAXParserOptions](sax-parser-options.md)|

___
<a id="on_comment"></a>

###  on("comment")

▸ **on**(event: *"comment"*, listener: *`function`*): `this`

Raised then parser encounters a comment.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "comment" |
| listener | `function` (see below) |

**Returns:** `this`

**listener:** (text: *`string`*, location?: *[Location](../../parse5/docs/source-code-location/location.md)*): `void`

| Param | Type | Description |
| ------ | ------ | ------ |
|text| `string`| Comment text.|
|`Optional` location| [Location](../../parse5/docs/source-code-location/location.md)| Comment source code location info. Available if location info is enabled via [SAXParserOptions](sax-parser-options.md)|
___
<a id="on_text"></a>

###  on("text")

▸ **on**(event: *"text"*, listener: *`function`*): `this`

Raised then parser encounters text content.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "text" |
| listener | `function` (see below)|

**Returns:** `this`

**listener:** (text: *`string`*, location?: [Location](../../parse5/docs/source-code-location/location.md)): `void`

| Param | Type | Description |
| ------ | ------ | ------ |
|text|`string`| Text content.|
|`Optional` location| [Location](../../parse5/docs/source-code-location/location.md)| Text content source code location info. Available if location info is enabled via [SAXParserOptions](sax-parser-options.md)|
___
<a id="on_doctype"></a>

###  on("doctype")

▸ **on**(event: *"doctype"*, listener: *`function`*): `this`

Raised then parser encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "doctype" |
| listener | `function` (see below) |

**Returns:** `this`

**listener:** (name: *`string`*, publicId: *`string`*, systemId: *`string`*, location?: [Location](../../parse5/docs/source-code-location/location.md)): `void`


| Param | Type | Description |
| ------ | ------ | ------ |
|name|`string`| Document type name.|
|publicId|`string`| Document type public identifier.|
|systemId|`string`| Document type system identifier.|
|`Optional` location| [Location](../../parse5/docs/source-code-location/location.md)| Document type declaration source code location info. Available if location info is enabled via [SAXParserOptions](sax-parser-options.md)|

___
