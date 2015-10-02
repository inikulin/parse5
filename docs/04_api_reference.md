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
<dt><a href="#ParserOptions">ParserOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SerializerOptions">SerializerOptions</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#SAXParserOptions">SAXParserOptions</a> : <code>Object</code></dt>
<dd></dd>
</dl>
<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.ParserStream](#parse5+ParserStream) ⇐ <code>stream.Writable</code>
    * [new ParserStream(options)](#new_parse5+ParserStream_new)
    * [.document](#parse5+ParserStream+document) : <code>ASTNode.&lt;document&gt;</code>
    * ["script" (scriptElement, documentWrite(html), resume)](#parse5+ParserStream+event_script)
  * [.SerializerStream](#parse5+SerializerStream) ⇐ <code>stream.Readable</code>
    * [new SerializerStream(node, [options])](#new_parse5+SerializerStream_new)
  * [.SAXParser](#parse5+SAXParser) ⇐ <code>stream.Transform</code>
    * [new SAXParser(options)](#new_parse5+SAXParser_new)
    * ["startTag" (name, attributes, selfClosing, [location])](#parse5+SAXParser+event_startTag)
    * ["endTag" (name, [location])](#parse5+SAXParser+event_endTag)
    * ["comment" (text, [location])](#parse5+SAXParser+event_comment)
    * ["doctype" (name, publicId, systemId, [location])](#parse5+SAXParser+event_doctype)
    * ["text" (text, [location])](#parse5+SAXParser+event_text)
  * [.treeAdapters](#parse5+treeAdapters)
  * [.parse(html, [options])](#parse5+parse) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.parseFragment([fragmentContext], html, [options])](#parse5+parseFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.serialize(node, [options])](#parse5+serialize) ⇒ <code>String</code>
  * [.stop()](#parse5+stop)

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
Streaming HTML parser with the scripting support.[Writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).


| Param | Type | Description |
| --- | --- | --- |
| options | <code>[ParserOptions](#ParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');var http = require('http');// Fetch google.com content and obtain it's <body> nodehttp.get('http://google.com', function(res) { var parser = new parse5.ParserStream(); parser.on('finish', function() {     var body = parser.document.childNodes[0].childNodes[1]; }); res.pipe(parser);});
```
<a name="parse5+ParserStream+document"></a>
#### parserStream.document : <code>ASTNode.&lt;document&gt;</code>
Resulting document node.

**Kind**: instance property of <code>[ParserStream](#parse5+ParserStream)</code>  
<a name="parse5+ParserStream+event_script"></a>
#### "script" (scriptElement, documentWrite(html), resume)
Raised then parser encounters `<script>` element.If event has listeners then parsing will be suspended on event emission.So, if `<script>` has `src` attribute you can fetch it, execute and thenresume parser like browsers do.

**Kind**: event emitted by <code>[ParserStream](#parse5+ParserStream)</code>  

| Param | Type | Description |
| --- | --- | --- |
| scriptElement | <code>ASTNode</code> | Script element that caused the event. |
| documentWrite(html) | <code>function</code> | Write additional `html` at the current parsing position. Suitable for the DOM `document.write` and `document.writeln` methods implementation. |
| resume | <code>function</code> | Resumes the parser. |

**Example**  
```js
var parse = require('parse5');var http = require('http');var parser = new parse5.ParserStream();parser.on('script', function(scriptElement, documentWrite, resume) {  var src = parse5.treeAdapters.default.getAttrList(scriptElement)[0].value;  http.get(src, function(res) {     // Fetch script content, execute it with DOM built around `parser.document` and     // `document.write` implemented using `documentWrite`     ...     // Then resume the parser     resume();  });});parser.end('<script src="example.com/script.js"></script>');
```
<a name="parse5+SerializerStream"></a>
### parse5.SerializerStream ⇐ <code>stream.Readable</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Readable</code>  
<a name="new_parse5+SerializerStream_new"></a>
#### new SerializerStream(node, [options])
Streaming AST node to HTML serializer.
[Readable stream](https://nodejs.org/api/stream.html#stream_class_stream_readable).


| Param | Type | Description |
| --- | --- | --- |
| node | <code>ASTNode</code> | Node to serialize. |
| [options] | <code>[SerializerOptions](#SerializerOptions)</code> | Serialization options. |

**Example**  
```js
var parse5 = require('parse5');
var fs = require('fs');

var file = fs.createWriteStream('/home/index.html');

// Serialize parsed document to the HTML and write it to file
var document = parse5.parse('<body>Who is John Galt?</body>');
var serializer = new parse5.SerializerStream(document);

serializer.pipe(file);
```
<a name="parse5+SAXParser"></a>
### parse5.SAXParser ⇐ <code>stream.Transform</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Transform</code>  

* [.SAXParser](#parse5+SAXParser) ⇐ <code>stream.Transform</code>
  * [new SAXParser(options)](#new_parse5+SAXParser_new)
  * ["startTag" (name, attributes, selfClosing, [location])](#parse5+SAXParser+event_startTag)
  * ["endTag" (name, [location])](#parse5+SAXParser+event_endTag)
  * ["comment" (text, [location])](#parse5+SAXParser+event_comment)
  * ["doctype" (name, publicId, systemId, [location])](#parse5+SAXParser+event_doctype)
  * ["text" (text, [location])](#parse5+SAXParser+event_text)

<a name="new_parse5+SAXParser_new"></a>
#### new SAXParser(options)
Streaming [SAX](https://en.wikipedia.org/wiki/Simple_API_for_XML)-style HTML parser.
[Transform stream](https://nodejs.org/api/stream.html#stream_class_stream_transform)
(which means you can pipe *through* it, see example).


| Param | Type | Description |
| --- | --- | --- |
| options | <code>[SAXParserOptions](#SAXParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');
var http = require('http');
var fs = require('fs');

var file = fs.createWriteStream('/home/google.com.html');
var parser = new SAXParser();

parser.on('text', function(text) {
 // Handle page text content
 ...
});

http.get('http://google.com', function(res) {
 // SAXParser is the Transform stream, which means you can pipe
 // through it. So you can analyze page content and e.g. save it
 // to the file at the same time:
 res.pipe(parser).pipe(file);
});
```
<a name="parse5+SAXParser+event_startTag"></a>
#### "startTag" (name, attributes, selfClosing, [location])
Raised then parser encounters start tag.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Tag name. |
| attributes | <code>String</code> | List of attributes in `{ key: String, value: String }` form. |
| selfClosing | <code>Boolean</code> | Indicates if tag is self-closing. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Start tag source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_endTag"></a>
#### "endTag" (name, [location])
Raised then parser encounters end tag.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Tag name. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | End tag source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_comment"></a>
#### "comment" (text, [location])
Raised then parser encounters comment.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> | Comment text. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Comment source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_doctype"></a>
#### "doctype" (name, publicId, systemId, [location])
Raised then parser encounters [document type declaration](https://en.wikipedia.org/wiki/Document_type_declaration).

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| name | <code>String</code> | Document type name. |
| publicId | <code>String</code> | Document type publicId. |
| systemId | <code>String</code> | Document type systemId. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Document type declaration source code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+SAXParser+event_text"></a>
#### "text" (text, [location])
Raised then parser encounters text content.

**Kind**: event emitted by <code>[SAXParser](#parse5+SAXParser)</code>  

| Param | Type | Description |
| --- | --- | --- |
| text | <code>String</code> | Text content. |
| [location] | <code>[LocationInfo](#LocationInfo)</code> | Text content code location info. Available if location info is enabled in [SAXParserOptions](#SAXParserOptions). |

<a name="parse5+treeAdapters"></a>
### parse5.treeAdapters
Provides built-in tree adapters which can be used for parsing and serialization.

**Kind**: instance property of <code>[parse5](#parse5)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| default | <code>TreeAdapter</code> | Default tree format for parse5. |
| htmlparser2 | <code>TreeAdapter</code> | Quite popular [htmlparser2](https://github.com/fb55/htmlparser2) tree format (e.g. used by [cheerio](https://github.com/MatthewMueller/cheerio) and [jsdom](https://github.com/tmpvar/jsdom)). |

**Example**  
```js
var parse5 = require('parse5');

// Use default tree adapter for parsing
var document = parse5.parse('<div></div>', { treeAdapter: parse5.treeAdapters.default });

// Use htmlparser2 tree adapter with SerializerStream
var serializer = new parse5.SerializerStream(node, { treeAdapter: parse5.treeAdapters.htmlparser2 });
```
<a name="parse5+parse"></a>
### parse5.parse(html, [options]) ⇒ <code>ASTNode.&lt;Document&gt;</code>
Parses HTML string.

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
Parses HTML fragment.

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

//Parse html fragment in context of the parsed <table> element
var trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
```
<a name="parse5+serialize"></a>
### parse5.serialize(node, [options]) ⇒ <code>String</code>
Serializes AST node to HTML string.

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

//Serialize document
var html = parse5.serialize(document);

//Serialize <body> element content
var bodyInnerHtml = parse5.serialize(document.childNodes[0].childNodes[1]);
```
<a name="parse5+stop"></a>
### parse5.stop()
Stops parsing. Useful if you want parser to stop consume
CPU time once you've obtained desired info from input stream.
Doesn't prevents piping, so data will flow through parser as usual.

**Kind**: instance method of <code>[parse5](#parse5)</code>  
**Example**  
```js
var parse5 = require('parse5');
var http = require('http');
var fs = require('fs');

var file = fs.createWriteStream('/home/google.com.html');
var parser = new parse5.SAXParser();

parser.on('doctype', function(name, publicId, systemId) {
 // Process doctype info ans stop parsing
 ...
 parser.stop();
});

http.get('http://google.com', function(res) {
 // Despite the fact that parser.stop() was called whole
 // content of the page will be written to the file
 res.pipe(parser).pipe(file);
});
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

<a name="ParserOptions"></a>
## ParserOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| decodeHtmlEntities | <code>Boolean</code> | <code>true</code> | Decode HTML-entities like `&amp;`, `&nbsp;`, etc. **Warning:** disabling this option may result in output that does not conform to the HTML5 specification. |
| locationInfo | <code>Boolean</code> | <code>false</code> | Enables source code location information for the nodes. When enabled, each node (except root node) has `__location` property. In case the node is not an empty element, `__location` will be [ElementLocationInfo](#ElementLocationInfo) object, otherwise it's [LocationInfo](#LocationInfo). If element was implicitly created by the parser it's `__location` property will be `null`. |
| treeAdapter | <code>TreeAdapter</code> | <code>parse5.treeAdapters.default</code> | Specifies resulting tree format. |

<a name="SerializerOptions"></a>
## SerializerOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| encodeHtmlEntities | <code>Boolean</code> | <code>true</code> | HTML-encode characters like `<`, `>`, `&`, etc. **Warning:** disabling this option may result in output that does not conform to the HTML5 specification. |
| treeAdapter | <code>TreeAdapter</code> | <code>parse5.treeAdapters.default</code> | Specifies input tree format. |

<a name="SAXParserOptions"></a>
## SAXParserOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| decodeHtmlEntities | <code>Boolean</code> | <code>true</code> | Decode HTML-entities like `&amp;`, `&nbsp;`, etc. **Warning:** disabling this option may result in output that does not conform to the HTML5 specification. |
| locationInfo | <code>Boolean</code> | <code>false</code> | Enables source code location information for the tokens. When enabled, each token event handler will receive [LocationInfo](#LocationInfo) object as the last argument. |

