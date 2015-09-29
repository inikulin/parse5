# API Reference
<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.parse(html, [options])](#parse5.parse) ⇒ <code>ASTNode.&lt;Document&gt;</code>
  * [.parseFragment([fragmentContext], html, [options])](#parse5.parseFragment) ⇒ <code>ASTNode.&lt;DocumentFragment&gt;</code>
  * [.serialize(node, [options])](#parse5.serialize) ⇒ <code>String</code>

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
