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

* [stop](#stop)

See also: [transform stream API](https://nodejs.org/api/stream.html#stream_class_stream_transform).

### Events

* [on("startTag")](#on_startag)
* [on("endTag")](#on_startag)
* [on("comment")](#on_comment)
* [on("text")](#on_text)
* [on("doctype")](#on_doctype)

See also: [transform stream API](https://nodejs.org/api/stream.html#stream_class_stream_transform).

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

## Events

<a id="on_starttag"></a>

###  on("startTag")

▸ **on**(event: *"startTag"*, listener: *`function`*): `this`

Raised when the parser encounters a start tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "startTag" |
| listener | function (startTag: *[StartTagToken](./tokens/start-tag.md)*) |

**Returns:** `this`

___
<a id="on_endtag"></a>

###  on("endTag")

▸ **on**(event: *"endTag"*, listener: *`function`*): `this`

Raised when parser encounters an end tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "endTag" |
| listener | function (endTag: *[EndTagToken](./tokens/end-tag.md)*) |

**Returns:** `this`

___
<a id="on_comment"></a>

###  on("comment")

▸ **on**(event: *"comment"*, listener: *`function`*): `this`

Raised when parser encounters a comment.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "comment" |
| listener | function (comment: *[CommentToken](./tokens/comment.md)*) |

**Returns:** `this`

___
<a id="on_text"></a>

###  on("text")

▸ **on**(event: *"text"*, listener: *`function`*): `this`

Raised when parser encounters text content.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "text" |
| listener | function (text: *[TextToken](./tokens/text.md)*)|

**Returns:** `this`

___
<a id="on_doctype"></a>

###  on("doctype")

▸ **on**(event: *"doctype"*, listener: *`function`*): `this`

Raised when parser encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "doctype" |
| listener | function (doctype: *[DoctypeToken](./tokens/doctype.md)*) |

**Returns:** `this`

___
