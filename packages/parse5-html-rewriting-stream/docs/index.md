# Class: RewritingStream

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
