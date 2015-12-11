# API Reference
## Objects
<dl>
<dt><a href="#parse5">parse5</a> : <code>object</code></dt>
<dd></dd>
</dl>
## Typedefs
<dl>
<dt><a href="#ElementLocationInfo">ElementLocationInfo</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#LocationInfo">LocationInfo</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SAXParserOptions">SAXParserOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ParserOptions">ParserOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SerializerOptions">SerializerOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#TreeAdapter">TreeAdapter</a> : <code>Object</code></dt>
<dd></dd>
</dl>
<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.SAXParser](#parse5+SAXParser) ⇐ <code>stream.Transform</code>
    * [new SAXParser(options)](#new_parse5+SAXParser_new)
    * [.stop()](#parse5+SAXParser+stop)
    * ["startTag" (name, attributes, selfClosing, [location])](#parse5+SAXParser+event_startTag)
    * ["endTag" (name, [location])](#parse5+SAXParser+event_endTag)
    * ["comment" (text, [location])](#parse5+SAXParser+event_comment)
    * ["doctype" (name, publicId, systemId, [location])](#parse5+SAXParser+event_doctype)
    * ["text" (text, [location])](#parse5+SAXParser+event_text)
  * [.ParserStream](#parse5+ParserStream) ⇐ <code>stream.Writable</code>
    * [new ParserStream(options)](#new_parse5+ParserStream_new)
    * [.document](#parse5+ParserStream+document) : <code>ASTNode.&lt;document&gt;</code>
    * ["script" (scriptElement, documentWrite(html), resume)](#parse5+ParserStream+event_script)
  * [.SerializerStream](#parse5+SerializerStream) ⇐ <code>stream.Readable</code>
    * [new SerializerStream(node, [options])](#new_parse5+SerializerStream_new)
  * [.treeAdapters](#parse5+treeAdapters)
  * [.parse(html, [options])](#parse5+parse) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.parseFragment([fragmentContext], html, [options])](#parse5+parseFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.serialize(node, [options])](#parse5+serialize) ⇒ <code>String</code>

<a name="parse5+SAXParser"></a>
### parse5.SAXParser ⇐ <code>stream.Transform</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Transform</code>  

* [.SAXParser](#parse5+SAXParser) ⇐ <code>stream.Transform</code>
  * [new SAXParser(options)](#new_parse5+SAXParser_new)
  * [.stop()](#parse5+SAXParser+stop)
  * ["startTag" (name, attributes, selfClosing, [location])](#parse5+SAXParser+event_startTag)
  * ["endTag" (name, [location])](#parse5+SAXParser+event_endTag)
  * ["comment" (text, [location])](#parse5+SAXParser+event_comment)
  * ["doctype" (name, publicId, systemId, [location])](#parse5+SAXParser+event_doctype)
  * ["text" (text, [location])](#parse5+SAXParser+event_text)

<a name="new_parse5+SAXParser_new"></a>
#### new SAXParser(options)
Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML parser.A [transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform)(which means you can pipe *through* it, see example).


| Param | Type | Description |
| --- | --- | --- |
| options | <code>[SAXParserOptions](#SAXParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');var http = require('http');var fs = require('fs');var file = fs.createWriteStream('/home/google.com.html');var parser = new parse5.SAXParser();parser.on('text', function(text) { // Handle page text content ...});http.get('http://google.com', function(res) { // SAXParser is the Transform stream, which means you can pipe // through it. So, you can analyze page content and, e.g., save it // to the file at the same time: res.pipe(parser).pipe(file);});
```
<a name="parse5+SAXParser+stop"></a>
#### saxParser.stop()
Stops parsing. Useful if you want the parser to stop consuming CPU time once you've obtained the desired infofrom the input stream. Doesn't prevent piping, so that data will flow through the parser as usual.

**Kind**: instance method of <code>[SAXParser](#parse5+SAXParser)</code>  
**Example**  
```js
var parse5 = require('parse5');var http = require('http');var fs = require('fs');var file = fs.createWriteStream('/home/google.com.html');var parser = new parse5.SAXParser();parser.on('doctype', function(name, publicId, systemId) { // Process doctype info ans stop parsing ... parser.stop();});http.get('http://google.com', function(res) { // Despite the fact that parser.stop() was called whole // content of the page will be written to the file res.pipe(parser).pipe(file);});
```
<a name="parse5+SAXParser+event_startTag"></a>
#### "startTag" (name, attributes, selfClosing, [location])
Raised when the parser encounters a start tag.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Tag name. |
| attributes | <code>String</code> | List of attributes in the `{ key: String, value: String }` form. |
| selfClosing | <code>Boolean</code> | Indicates if the tag is self-closing. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Start tag source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_endTag"></a>
#### "endTag" (name, [location])
Raised then parser encounters an end tag.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Tag name. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | End tag source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_comment"></a>
#### "comment" (text, [location])
Raised then parser encounters a comment.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> | Comment text. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Comment source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_doctype"></a>
#### "doctype" (name, publicId, systemId, [location])
Raised then parser encounters a [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Document type name. |
| publicId | <code>String</code> | Document type public identifier. |
| systemId | <code>String</code> | Document type system identifier. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Document type declaration source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_text"></a>
#### "text" (text, [location])
Raised then parser encounters text content.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> | Text content. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Text content code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+ParserStream"></a>
### parse5.ParserStream ⇐ <code>stream.Writable</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Writable</code>  

* [.ParserStream](#parse5+ParserStream) ⇐ <code>stream.Writable</code>
  * [new ParserStream(options)](#new_parse5+ParserStream_new)
  * [.document](#parse5+ParserStream+document) : <code>ASTNode.&lt;document&gt;</code>
  * ["script" (scriptElement, documentWrite(html), resume)](#parse5+ParserStream+event_script)

<a name="new_parse5+ParserStream_new"></a>
#### new ParserStream(options)
Streaming HTML parser with scripting support.A [writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).


| Param | Type | Description |
| --- | --- | --- |
| options | <code>[ParserOptions](#ParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');var http = require('http');// Fetch the google.com content and obtain it's <body> nodehttp.get('http://google.com', function(res) { var parser = new parse5.ParserStream(); parser.on('finish', function() {     var body = parser.document.childNodes[0].childNodes[1]; }); res.pipe(parser);});
```
<a name="parse5+ParserStream+document"></a>
#### parserStream.document : <code>ASTNode.&lt;document&gt;</code>
The resulting document node.

**Kind**: instance property of <code>[ParserStream](#parse5+ParserStream)</code>  
<a name="parse5+ParserStream+event_script"></a>
#### "script" (scriptElement, documentWrite(html), resume)
Raised then parser encounters a `<script>` element.If this event has listeners, parsing will be suspended once it is emitted.So, if `<script>` has the `src` attribute, you can fetch it, execute and then resume parsing just like browsers do.

**Kind**: event emitted by <code>[ParserStream](#parse5+ParserStream)</code>  

| Param | Type | Description |
| --- | --- | --- |
| scriptElement | <code>ASTNode</code> | The script element that caused the event. |
| documentWrite(html) | <code>function</code> | Write additional `html` at the current parsing position.  Suitable for implementing the DOM `document.write` and `document.writeln` methods. |
| resume | <code>function</code> | Resumes parsing. |

**Example**  
```js
var parse = require('parse5');var http = require('http');var parser = new parse5.ParserStream();parser.on('script', function(scriptElement, documentWrite, resume) {  var src = parse5.treeAdapters.default.getAttrList(scriptElement)[0].value;  http.get(src, function(res) {     // Fetch the script content, execute it with DOM built around `parser.document` and     // `document.write` implemented using `documentWrite`.     ...     // Then resume parsing.     resume();  });});parser.end('<script src="example.com/script.js"></script>');
```
<a name="parse5+SerializerStream"></a>
### parse5.SerializerStream ⇐ <code>stream.Readable</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Readable</code>  
<a name="new_parse5+SerializerStream_new"></a>
#### new SerializerStream(node, [options])
Streaming AST node to an HTML serializer.
A [readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).


| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node to serialize. |
| [options] | <code>[SerializerOptions](#SerializerOptions)</code> | Serialization options. |

**Example**  
```js
var parse5 = require('parse5');
var fs = require('fs');

var file = fs.createWriteStream('/home/index.html');

// Serializes the parsed document to HTML and writes it to the file.
var document = parse5.parse('<body>Who is John Galt?</body>');
var serializer = new parse5.SerializerStream(document);

serializer.pipe(file);
```
<a name="parse5+treeAdapters"></a>
### parse5.treeAdapters
Provides built-in tree adapters that can be used for parsing and serialization.

**Kind**: instance property of <code>[parse5](#parse5)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| default | <code>[TreeAdapter](#TreeAdapter)</code> | Default tree format for parse5. |
| htmlparser2 | <code>[TreeAdapter](#TreeAdapter)</code> | Quite popular [htmlparser2](https://github.com/fb55/htmlparser2) tree format (e.g. used by [cheerio](https://github.com/MatthewMueller/cheerio) and [jsdom](https://github.com/tmpvar/jsdom)). |

**Example**  
```js
var parse5 = require('parse5');

// Uses the default tree adapter for parsing.
var document = parse5.parse('<div></div>', { treeAdapter: parse5.treeAdapters.default });

// Uses the htmlparser2 tree adapter with the SerializerStream.
var serializer = new parse5.SerializerStream(node, { treeAdapter: parse5.treeAdapters.htmlparser2 });
```
<a name="parse5+parse"></a>
### parse5.parse(html, [options]) ⇒ <code>ASTNode.&lt;Document&gt;</code>
Parses an HTML string.

**Kind**: instance method of <code>[parse5](#parse5)</code>  
**Returns**: <code>ASTNode.&lt;Document&gt;</code> - document  

| Param | Type | Description |
| --- | --- | --- |
| html | <code>string</code> | Input HTML string. |
| [options] | <code>[ParserOptions](#ParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
```
<a name="parse5+parseFragment"></a>
### parse5.parseFragment([fragmentContext], html, [options]) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
Parses an HTML fragment.

**Kind**: instance method of <code>[parse5](#parse5)</code>  
**Returns**: <code>ASTNode.&lt;DocumentFragment&gt;</code> - documentFragment  

| Param | Type | Description |
| --- | --- | --- |
| [fragmentContext] | <code>ASTNode</code> | Parsing context element. If specified, given fragment will be parsed as if it was set to the context element's `innerHTML` property. |
| html | <code>string</code> | Input HTML fragment string. |
| [options] | <code>[ParserOptions](#ParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');

var documentFragment = parse5.parseFragment('<table></table>');

// Parses the html fragment in the context of the parsed <table> element.
var trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
```
<a name="parse5+serialize"></a>
### parse5.serialize(node, [options]) ⇒ <code>String</code>
Serializes an AST node to an HTML string.

**Kind**: instance method of <code>[parse5](#parse5)</code>  
**Returns**: <code>String</code> - html  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node to serialize. |
| [options] | <code>[SerializerOptions](#SerializerOptions)</code> | Serialization options. |

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');

// Serializes a document.
var html = parse5.serialize(document);

// Serializes the <body> element content.
var bodyInnerHtml = parse5.serialize(document.childNodes[0].childNodes[1]);
```
<a name="ElementLocationInfo"></a>
## ElementLocationInfo : <code>Object</code>
**Kind**: global typedef  
**Extends:** <code>[LocationInfo](#LocationInfo)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| startTag | <code>[LocationInfo](#LocationInfo)</code> | Element's start tag [LocationInfo](#LocationInfo). |
| endTag | <code>[LocationInfo](#LocationInfo)</code> | Element's end tag [LocationInfo](#LocationInfo). |

<a name="LocationInfo"></a>
## LocationInfo : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| line | <code>Number</code> | One-based line index |
| col | <code>Number</code> | One-based column index |
| startOffset | <code>Number</code> | Zero-based first character index |
| endOffset | <code>Number</code> | Zero-based last character index |

<a name="SAXParserOptions"></a>
## SAXParserOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| locationInfo | <code>Boolean</code> | <code>false</code> | Enables source code location information for the tokens. When enabled, each token event handler will receive [LocationInfo](#LocationInfo) object as its last argument. |

<a name="ParserOptions"></a>
## ParserOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| locationInfo | <code>Boolean</code> | <code>false</code> | Enables source code location information for the nodes. When enabled, each node (except root node) has the `__location` property. In case the node is not an empty element, `__location` will be [ElementLocationInfo](#ElementLocationInfo) object, otherwise it's [LocationInfo](#LocationInfo). If the element was implicitly created by the parser it's `__location` property will be `null`. |
| treeAdapter | <code>[TreeAdapter](#TreeAdapter)</code> | <code>parse5.treeAdapters.default</code> | Specifies the resulting tree format. |

<a name="SerializerOptions"></a>
## SerializerOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| treeAdapter | <code>[TreeAdapter](#TreeAdapter)</code> | <code>parse5.treeAdapters.default</code> | Specifies input tree format. |

<a name="TreeAdapter"></a>
## TreeAdapter : <code>Object</code>
**Kind**: global typedef  

* [TreeAdapter](#TreeAdapter) : <code>Object</code>
  * [.createDocument()](#TreeAdapter.createDocument) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.createDocumentFragment()](#TreeAdapter.createDocumentFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.createElement(tagName, namespaceURI, attrs)](#TreeAdapter.createElement) ⇒ <code>ASTNode.&lt;Element&gt;</code>
  * [.createElement(data)](#TreeAdapter.createElement) ⇒ <code>ASTNode.&lt;CommentNode&gt;</code>
  * [.appendChild(parentNode, newNode)](#TreeAdapter.appendChild)
  * [.insertBefore(parentNode, newNode, referenceNode)](#TreeAdapter.insertBefore)
  * [.setTemplateContent(templateElement, contentTemplate)](#TreeAdapter.setTemplateContent)
  * [.getTemplateContent(templateElement)](#TreeAdapter.getTemplateContent) ⇒ <code>Boolean</code>
  * [.setDocumentType(document, name, publicId, systemId)](#TreeAdapter.setDocumentType)
  * [.setQuirksMode(document)](#TreeAdapter.setQuirksMode)
  * [.setQuirksMode(document)](#TreeAdapter.setQuirksMode) ⇒ <code>Boolean</code>
  * [.detachNode(node)](#TreeAdapter.detachNode)
  * [.insertText(parentNode, text)](#TreeAdapter.insertText)
  * [.insertTextBefore(parentNode, text, referenceNode)](#TreeAdapter.insertTextBefore)
  * [.adoptAttributes(recipientNode, attrs)](#TreeAdapter.adoptAttributes)
  * [.getFirstChild(node)](#TreeAdapter.getFirstChild) ⇒ <code>ASTNode</code>
  * [.getChildNodes(node)](#TreeAdapter.getChildNodes) ⇒ <code>Array</code>
  * [.getParentNode(node)](#TreeAdapter.getParentNode) ⇒ <code>ASTNode</code>
  * [.getAttrList(node)](#TreeAdapter.getAttrList) ⇒ <code>Array</code>
  * [.getTagName(element)](#TreeAdapter.getTagName) ⇒ <code>String</code>
  * [.getNamespaceURI(element)](#TreeAdapter.getNamespaceURI) ⇒ <code>String</code>
  * [.getTextNodeContent(textNode)](#TreeAdapter.getTextNodeContent) ⇒ <code>String</code>
  * [.getTextNodeContent(commentNode)](#TreeAdapter.getTextNodeContent) ⇒ <code>String</code>
  * [.getDocumentTypeNodeName(doctypeNode)](#TreeAdapter.getDocumentTypeNodeName) ⇒ <code>String</code>
  * [.getDocumentTypeNodePublicId(doctypeNode)](#TreeAdapter.getDocumentTypeNodePublicId) ⇒ <code>String</code>
  * [.getDocumentTypeNodeSystemId(doctypeNode)](#TreeAdapter.getDocumentTypeNodeSystemId) ⇒ <code>String</code>
  * [.isTextNode(node)](#TreeAdapter.isTextNode) ⇒ <code>Boolean</code>
  * [.isCommentNode(node)](#TreeAdapter.isCommentNode) ⇒ <code>Boolean</code>
  * [.isDocumentTypeNode(node)](#TreeAdapter.isDocumentTypeNode) ⇒ <code>Boolean</code>
  * [.isElementNode(node)](#TreeAdapter.isElementNode) ⇒ <code>Boolean</code>

<a name="TreeAdapter.createDocument"></a>
### TreeAdapter.createDocument() ⇒ <code>ASTNode.&lt;Document&gt;</code>
Creates a document node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode.&lt;Document&gt;</code> - document  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L19)  
<a name="TreeAdapter.createDocumentFragment"></a>
### TreeAdapter.createDocumentFragment() ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
Creates a document fragment node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode.&lt;DocumentFragment&gt;</code> - fragment  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L37)  
<a name="TreeAdapter.createElement"></a>
### TreeAdapter.createElement(tagName, namespaceURI, attrs) ⇒ <code>ASTNode.&lt;Element&gt;</code>
Creates an element node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode.&lt;Element&gt;</code> - element  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L61)  

| Param | Type | Description |
| --- | --- | --- |
| tagName | <code>String</code> | Tag name of the element. |
| namespaceURI | <code>String</code> | Namespace of the element. |
| attrs | <code>Array</code> | Attribute name-value pair array.                         Foreign attributes may contain `namespace` and `prefix` fields as well. |

<a name="TreeAdapter.createElement"></a>
### TreeAdapter.createElement(data) ⇒ <code>ASTNode.&lt;CommentNode&gt;</code>
Creates a comment node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode.&lt;CommentNode&gt;</code> - comment  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L85)  

| Param | Type | Description |
| --- | --- | --- |
| data | <code>String</code> | Comment text. |

<a name="TreeAdapter.appendChild"></a>
### TreeAdapter.appendChild(parentNode, newNode)
Appends a child node to the given parent node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L114)  

| Param | Type | Description |
| --- | --- | --- |
| parentNode | <code>ASTNode</code> | Parent node. |
| newNode | <code>ASTNode</code> | Child node. |

<a name="TreeAdapter.insertBefore"></a>
### TreeAdapter.insertBefore(parentNode, newNode, referenceNode)
Inserts a child node to the given parent node before the given reference node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L131)  

| Param | Type | Description |
| --- | --- | --- |
| parentNode | <code>ASTNode</code> | Parent node. |
| newNode | <code>ASTNode</code> | Child node. |
| referenceNode | <code>ASTNode</code> | Reference node. |

<a name="TreeAdapter.setTemplateContent"></a>
### TreeAdapter.setTemplateContent(templateElement, contentTemplate)
Sets the <template> element content element.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L149)  

| Param | Type | Description |
| --- | --- | --- |
| templateElement | <code>ASTNode.&lt;TemplateElement&gt;</code> | <template> element. |
| contentTemplate | <code>ASTNode.&lt;DocumentFragment&gt;</code> | Content element. |

<a name="TreeAdapter.getTemplateContent"></a>
### TreeAdapter.getTemplateContent(templateElement) ⇒ <code>Boolean</code>
Returns the <template> element content element.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L166)  

| Param | Type | Description |
| --- | --- | --- |
| templateElement | <code>ASTNode.&lt;DocumentFragment&gt;</code> | <template> element. |

<a name="TreeAdapter.setDocumentType"></a>
### TreeAdapter.setDocumentType(document, name, publicId, systemId)
Sets the document type. If the `document` already contains a document type node, the `name`, `publicId` and `systemId`
properties of this node will be updated with the provided values. Otherwise, creates a new document type node
with the given properties and inserts it into the `document`.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L185)  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>ASTNode.&lt;Document&gt;</code> | Document node. |
| name | <code>String</code> | Document type name. |
| publicId | <code>String</code> | Document type public identifier. |
| systemId | <code>String</code> | Document type system identifier. |

<a name="TreeAdapter.setQuirksMode"></a>
### TreeAdapter.setQuirksMode(document)
Sets the document's quirks mode flag.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L221)  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>ASTNode.&lt;Document&gt;</code> | Document node. |

<a name="TreeAdapter.setQuirksMode"></a>
### TreeAdapter.setQuirksMode(document) ⇒ <code>Boolean</code>
Determines if the document's quirks mode flag is set.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L237)  

| Param | Type | Description |
| --- | --- | --- |
| document | <code>ASTNode.&lt;Document&gt;</code> | Document node. |

<a name="TreeAdapter.detachNode"></a>
### TreeAdapter.detachNode(node)
Removes a node from its parent.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L251)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.insertText"></a>
### TreeAdapter.insertText(parentNode, text)
Inserts text into a node. If the last child of the node is a text node, the provided text will be appended to the
text node content. Otherwise, inserts a new text node with the given text.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L273)  

| Param | Type | Description |
| --- | --- | --- |
| parentNode | <code>ASTNode</code> | Node to insert text into. |
| text | <code>String</code> | Text to insert. |

<a name="TreeAdapter.insertTextBefore"></a>
### TreeAdapter.insertTextBefore(parentNode, text, referenceNode)
Inserts text into a sibling node that goes before the reference node. If this sibling node is the text node,
the provided text will be appended to the text node content. Otherwise, inserts a new sibling text node with
the given text before the reference node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L301)  

| Param | Type | Description |
| --- | --- | --- |
| parentNode | <code>ASTNode</code> | Node to insert text into. |
| text | <code>String</code> | Text to insert. |
| referenceNode | <code>ASTNode</code> | Node to insert text before. |

<a name="TreeAdapter.adoptAttributes"></a>
### TreeAdapter.adoptAttributes(recipientNode, attrs)
Copies attributes to the given node. Only attributes that are not yet present in the node are copied.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L321)  

| Param | Type | Description |
| --- | --- | --- |
| recipientNode | <code>ASTNode</code> | Node to copy attributes into. |
| attrs | <code>Array</code> | Attributes to copy. |

<a name="TreeAdapter.getFirstChild"></a>
### TreeAdapter.getFirstChild(node) ⇒ <code>ASTNode</code>
Returns the first child of the given node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode</code> - firstChild  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L348)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.getChildNodes"></a>
### TreeAdapter.getChildNodes(node) ⇒ <code>Array</code>
Returns the given node's children in an array.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>Array</code> - children  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L364)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.getParentNode"></a>
### TreeAdapter.getParentNode(node) ⇒ <code>ASTNode</code>
Returns the given node's parent.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>ASTNode</code> - parent  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L380)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.getAttrList"></a>
### TreeAdapter.getAttrList(node) ⇒ <code>Array</code>
Returns the given node's attributes in an array, in the form of name-value pairs.
Foreign attributes may contain `namespace` and `prefix` fields as well.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>Array</code> - attributes  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L397)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.getTagName"></a>
### TreeAdapter.getTagName(element) ⇒ <code>String</code>
Returns the given element's tag name.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - tagName  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L415)  

| Param | Type | Description |
| --- | --- | --- |
| element | <code>ASTNode.&lt;Element&gt;</code> | Element. |

<a name="TreeAdapter.getNamespaceURI"></a>
### TreeAdapter.getNamespaceURI(element) ⇒ <code>String</code>
Returns the given element's namespace.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - namespaceURI  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L431)  

| Param | Type | Description |
| --- | --- | --- |
| element | <code>ASTNode.&lt;Element&gt;</code> | Element. |

<a name="TreeAdapter.getTextNodeContent"></a>
### TreeAdapter.getTextNodeContent(textNode) ⇒ <code>String</code>
Returns the given text node's content.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - text  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L447)  

| Param | Type | Description |
| --- | --- | --- |
| textNode | <code>ASTNode.&lt;Text&gt;</code> | Text node. |

<a name="TreeAdapter.getTextNodeContent"></a>
### TreeAdapter.getTextNodeContent(commentNode) ⇒ <code>String</code>
Returns the given comment node's content.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - commentText  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L463)  

| Param | Type | Description |
| --- | --- | --- |
| commentNode | <code>ASTNode.&lt;Comment&gt;</code> | Comment node. |

<a name="TreeAdapter.getDocumentTypeNodeName"></a>
### TreeAdapter.getDocumentTypeNodeName(doctypeNode) ⇒ <code>String</code>
Returns the given document type node's name.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - name  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L479)  

| Param | Type | Description |
| --- | --- | --- |
| doctypeNode | <code>ASTNode.&lt;DocumentType&gt;</code> | Document type node. |

<a name="TreeAdapter.getDocumentTypeNodePublicId"></a>
### TreeAdapter.getDocumentTypeNodePublicId(doctypeNode) ⇒ <code>String</code>
Returns the given document type node's public identifier.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - publicId  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L495)  

| Param | Type | Description |
| --- | --- | --- |
| doctypeNode | <code>ASTNode.&lt;DocumentType&gt;</code> | Document type node. |

<a name="TreeAdapter.getDocumentTypeNodeSystemId"></a>
### TreeAdapter.getDocumentTypeNodeSystemId(doctypeNode) ⇒ <code>String</code>
Returns the given document type node's system identifier.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**Returns**: <code>String</code> - systemId  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L511)  

| Param | Type | Description |
| --- | --- | --- |
| doctypeNode | <code>ASTNode.&lt;DocumentType&gt;</code> | Document type node. |

<a name="TreeAdapter.isTextNode"></a>
### TreeAdapter.isTextNode(node) ⇒ <code>Boolean</code>
Determines if the given node is a text node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L526)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.isCommentNode"></a>
### TreeAdapter.isCommentNode(node) ⇒ <code>Boolean</code>
Determines if the given node is a comment node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L544)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.isDocumentTypeNode"></a>
### TreeAdapter.isDocumentTypeNode(node) ⇒ <code>Boolean</code>
Determines if the given node is a document type node.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L560)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

<a name="TreeAdapter.isElementNode"></a>
### TreeAdapter.isElementNode(node) ⇒ <code>Boolean</code>
Determines if the given node is an element.

**Kind**: static method of <code>[TreeAdapter](#TreeAdapter)</code>  
**See**: [default implementation.](https://github.com/inikulin/parse5/blob/tree-adapter-docs-rev/lib/tree_adapters/default.js#L576)  

| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node. |

