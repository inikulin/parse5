# Class: SAXParser

### Events

* [on("startTag")](#on_startag)
* [on("endTag")](#on_startag)
* [on("comment")](#on_comment)
* [on("text")](#on_text)
* [on("doctype")](#on_doctype)

See also: [transform stream API](https://nodejs.org/api/stream.html#stream_class_stream_transform).

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
