# Class: RewritingStream

Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML rewriter. A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform) (which means you can pipe _through_ it, see example).
Rewriter uses raw source representation of tokens if they are not modified by the user, therefore resulting
HTML is not affected by parser error-recovery mechanisms as in the classical parsing-serialization roundtrip.

*__example__*:

```js
    const RewritingStream = require('parse5-html-rewriting-stream');
    const http = require('http');
    const fs = require('fs');

    const file = fs.createWriteStream('/home/google.com.html');
    const rewriter = new RewritingStream();

    // Replace divs with spans
    rewriter.on('startTag', startTag => {
        if (startTag.tagName === 'span') {
            startTag.tagName = 'div';
        }

        rewriter.emitStartTag(startTag);
    });

    rewriter.on('endTag', endTag => {
        if (endTag.tagName === 'span') {
            endTag.tagName = 'div';
        }

        rewriter.emitEndTag(endTag);
    });

    // Wrap all text nodes with <i> tag
    rewriter.on('text', (_, raw) => {
        // Use raw representation of text without HTML entities decoding
        rewriter.emitRaw(`<i>${raw}</i>`);
    });

    http.get('http://google.com', res => {
       // Assumes response is UTF-8.
       res.setEncoding('utf8');
       // RewritingStream is the Transform stream, which means you can pipe
       // through it.
       res.pipe(rewriter).pipe(file);
    });
```

### Constructors

* [constructor](#constructor)

### Methods

* [emitStartTag](#emit_start_tag)
* [emitEndTag](#emit_end_tag)
* [emitText](#emit_text)
* [emitComment](#emit_comment)
* [emitDoctype](#emit_doctype)
* [emitRaw](#emit_raw)

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

⊕ **new RewritingStream**(): [RewritingStream]()

**Note:** [sourceCodeLocationInfo](../../parse5-sax-parser/docs/sax-parser-options.md#locationinfo) option is
always enabled for the [RewritingStream]().

**Returns:** [RewritingStream]()

___


## Methods

<a id="emit_start_tag"></a>

###  emitStartTag

▸ **emitStartTag**(startTag: *[StartTagToken](../../parse5-sax-parser/docs/tokens/start-tag.md)*): `void`

Emits serialized start tag token into the output stream.

**Returns:** `void`

___
<a id="emit_end_tag"></a>

###  emitEndTag

▸ **emitEndTag**(endTag: *[EndTagToken](../../parse5-sax-parser/docs/tokens/end-tag.md)*): `void`

Emits serialized end tag token into the output stream.

**Returns:** `void`

___
<a id="emit_text"></a>

###  emitText

▸ **emitText**(text: *[TextToken](../../parse5-sax-parser/docs/tokens/text.md)*): `void`

Emits serialized text token into the output stream.

**Returns:** `void`

___
<a id="emit_comment"></a>

###  emitComment

▸ **emitComment**(comment: *[CommentToken](../../parse5-sax-parser/docs/tokens/comment.md)*): `void`

Emits serialized comment token into the output stream.

**Returns:** `void`

___
<a id="emit_doctype"></a>

###  emitDoctype

▸ **emitDoctype**(doctype: *[DoctypeToken](../../parse5-sax-parser/docs/tokens/doctype.md)*): `void`

Emits serialized document type token into the output stream.

**Returns:** `void`

___
<a id="emit_raw"></a>

###  emitRaw

▸ **emitRaw**(html: *String*): `void`

Emits raw HTML string into the output stream.

**Returns:** `void`

___

## Events

**Note:** Each event listener receives raw HTML string representation of a token as its second
argument, which later can be emitted with the [emitRaw](#emit_raw) method. Thus, token will not be
re-serialized and will have the same markup as in the source HTML.

**Note:** If an event has an event handler attached, you need to emit token manually, otherwise
it will not get into the output stream.

<a id="on_starttag"></a>

###  on("startTag")

▸ **on**(event: *"startTag"*, listener: *`function`*): `this`

Raised when the rewriter encounters a start tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "startTag" |
| listener | function (startTag: *[StartTagToken](../../parse5-sax-parser/docs/tokens/start-tag.md)*, rawHtml: *String*) |

**Returns:** `this`

___
<a id="on_endtag"></a>

###  on("endTag")

▸ **on**(event: *"endTag"*, listener: *`function`*): `this`

Raised when rewriter encounters an end tag.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "endTag" |
| listener | function (endTag: *[EndTagToken](../../parse5-sax-parser/docs/tokens/end-tag.md)*, rawHtml: *String*) |

**Returns:** `this`

___
<a id="on_comment"></a>

###  on("comment")

▸ **on**(event: *"comment"*, listener: *`function`*): `this`

Raised when rewriter encounters a comment.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "comment" |
| listener | function (comment: *[CommentToken](../../parse5-sax-parser/docs/tokens/comment.md)*, rawHtml: *String*) |

**Returns:** `this`

___
<a id="on_text"></a>

###  on("text")

▸ **on**(event: *"text"*, listener: *`function`*): `this`

Raised when rewriter encounters text content.

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "text" |
| listener | function (text: *[TextToken](../../parse5-sax-parser/docs/tokens/text.md)*, rawHtml: *String*)|

**Returns:** `this`

___
<a id="on_doctype"></a>

###  on("doctype")

▸ **on**(event: *"doctype"*, listener: *`function`*): `this`

Raised when rewriter encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Parameters:**

| Param | Type |
| ------ | ------ |
| event | "doctype" |
| listener | function (doctype: *[DoctypeToken](../../parse5-sax-parser/docs/tokens/doctype.md)*, rawHtml: *String*) |

**Returns:** `this`

___
