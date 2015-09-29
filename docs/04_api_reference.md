# API Reference
<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.treeAdapters](#parse5.treeAdapters)
  * [.parse(html, [options])](#parse5.parse) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.parseFragment([fragmentContext], html, [options])](#parse5.parseFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.serialize(node, [options])](#parse5.serialize) ⇒ <code>String</code>

<a name="parse5.treeAdapters"></a>
### parse5.treeAdapters
Provides built-in tree adapters which can be used for parsing and serialization.

**Kind**: static property of <code>[parse5](#parse5)</code>  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| default | <code>TreeAdapter</code> | Default tree format for parse5. |
| htmlparser2 | <code>TreeAdapter</code> | Quite popular [htmlparser2](https://github.com/fb55/htmlparser2) tree format (e.g. used in [cheerio](https://github.com/MatthewMueller/cheerio) and [jsdom](https://github.com/tmpvar/jsdom)). |

**Example**  
```js
var parse5 = require('parse5');

// Use default tree adapter for parsing
var document = parse5.parse('<div></div>', { treeAdapter: parse5.treeAdapters.default });

// Use htmlparser2 tree adapter with SerializerStream
var serializer = new parse5.SerializerStream(node,{ treeAdapter: parse5.treeAdapters.htmlparser2 });
```
<a name="parse5.parse"></a>
### parse5.parse(html, [options]) ⇒ <code>ASTNode.&lt;Document&gt;</code>
Parses HTML string.

**Kind**: static method of <code>[parse5](#parse5)</code>  
**Returns**: <code>ASTNode.&lt;Document&gt;</code> - document  

| Param | Type |
| --- | --- |
| html | <code>string</code> | 
| [options] | <code>ParserOptions</code> | 

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
```
<a name="parse5.parseFragment"></a>
### parse5.parseFragment([fragmentContext], html, [options]) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
Parses HTML fragment. Consider it as setting `innerHTML` to the `fragmentContext` element.
If `fragmentContext` is not specified then `<template>` element will be used.

**Kind**: static method of <code>[parse5](#parse5)</code>  
**Returns**: <code>ASTNode.&lt;DocumentFragment&gt;</code> - documentFragment  

| Param | Type | Default |
| --- | --- | --- |
| [fragmentContext] | <code>ASTNode</code> | <code>ASTNode.&lt;TemplateElement&gt;</code> | 
| html | <code>string</code> |  | 
| [options] | <code>ParserOptions</code> |  | 

**Example**  
```js
var parse5 = require('parse5');

var documentFragment = parse5.parseFragment('<table></table>');

//Parse html fragment in context of the parsed <table> element
var trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
```
<a name="parse5.serialize"></a>
### parse5.serialize(node, [options]) ⇒ <code>String</code>
Serializes AST node to HTML string.

**Kind**: static method of <code>[parse5](#parse5)</code>  
**Returns**: <code>String</code> - html  

| Param | Type |
| --- | --- |
| node | <code>ASTNode</code> | 
| [options] | <code>SerializerOptions</code> | 

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');

//Serialize document
var html = parse5.serialize(document);

//Serialize <body> element content
var bodyInnerHtml = parse5.serialize(document.childNodes[0].childNodes[1]);
```
