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
</dl>
<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.ParserStream](#parse5+ParserStream) ⇐ <code>stream.Writable</code>
    * [new ParserStream(options)](#new_parse5+ParserStream_new)
    * [.document](#parse5+ParserStream+document) : <code>ASTNode.&lt;document&gt;</code>
  * [.SerializerStream](#parse5+SerializerStream) ⇐ <code>stream.Readable</code>
    * [new SerializerStream(node, [options])](#new_parse5+SerializerStream_new)
  * [.treeAdapters](#parse5+treeAdapters)
  * [.parse(html, [options])](#parse5+parse) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.parseFragment([fragmentContext], html, [options])](#parse5+parseFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.serialize(node, [options])](#parse5+serialize) ⇒ <code>String</code>

<a name="parse5+ParserStream"></a>
### parse5.ParserStream ⇐ <code>stream.Writable</code>
**Kind**: instance class of <code>[parse5](#parse5)</code>  
**Extends:** <code>stream.Writable</code>  

* [.ParserStream](#parse5+ParserStream) ⇐ <code>stream.Writable</code>
  * [new ParserStream(options)](#new_parse5+ParserStream_new)
  * [.document](#parse5+ParserStream+document) : <code>ASTNode.&lt;document&gt;</code>

<a name="new_parse5+ParserStream_new"></a>
#### new ParserStream(options)
Streaming HTML parser with the scripting support.
[Writable stream](https://nodejs.org/api/stream.html#stream_class_stream_writable).


| Param | Type | Description |
| --- | --- | --- |
| options | <code>[ParserOptions](#ParserOptions)</code> | Parsing options. |

**Example**  
```js
var parse5 = require('parse5');
var http = require('http');

// Fetch google.com content and obtain it's <body> node
http.get('http://google.com', function(res) {
 var parser = new parse5.ParserStream();

 parser.on('finish', function() {
     var body = parser.document.childNodes[0].childNodes[1];
 });

 res.pipe(parser);
});
```
<a name="parse5+ParserStream+document"></a>
#### parserStream.document : <code>ASTNode.&lt;document&gt;</code>
Resulting document node.

**Kind**: instance property of <code>[ParserStream](#parse5+ParserStream)</code>  
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
| decodeHtmlEntities | <code>Boolean</code> | <code>true</code> | Decode HTML-entities like `&amp;`, `&nbsp;`, etc. **Warning:** disabling this option may cause output which is not conform HTML5 specification. |
| locationInfo | <code>Boolean</code> | <code>false</code> | Enables source code location information for the nodes. When enabled, each node (except root node) has `__location` property. In case the node is not an empty element, `__location` will be [ElementLocationInfo](#ElementLocationInfo) object, otherwise it's [LocationInfo](#LocationInfo). If element was implicitly created by the parser it's `__location` property will be `null`. |
| treeAdapter | <code>TreeAdapter</code> | <code>parse5.treeAdapters.default</code> | Specifies resulting tree format. |

<a name="SerializerOptions"></a>
## SerializerOptions : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| encodeHtmlEntities | <code>Boolean</code> | <code>true</code> | HTML-encode characters like `<`, `>`, `&`, etc. **Warning:** disabling this option may cause output which is not conform HTML5 specification. |
| treeAdapter | <code>TreeAdapter</code> | <code>parse5.treeAdapters.default</code> | Specifies input tree format. |

