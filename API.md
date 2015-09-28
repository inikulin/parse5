<a name="parse5"></a>
## parse5 : <code>object</code>
**Kind**: global namespace  

* [parse5](#parse5) : <code>object</code>
  * [.parse(html, options)](#parse5.parse) ⇒ <code>ASTNode</code>
  * [.serialize(node, options)](#parse5.serialize) ⇒ <code>String</code>

<a name="parse5.parse"></a>
### parse5.parse(html, options) ⇒ <code>ASTNode</code>
Parses HTML string

**Kind**: static method of <code>[parse5](#parse5)</code>  
**Returns**: <code>ASTNode</code> - document  

| Param | Type |
| --- | --- |
| html | <code>string</code> | 
| options | <code>ParserOptions</code> | 

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
```
<a name="parse5.serialize"></a>
### parse5.serialize(node, options) ⇒ <code>String</code>
Serializes AST node to HTML string

**Kind**: static method of <code>[parse5](#parse5)</code>  
**Returns**: <code>String</code> - html  

| Param | Type |
| --- | --- |
| node | <code>ASTNode</code> | 
| options | <code>SerializerOptions</code> | 

**Example**  
```js
var parse5 = require('parse5');

var document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');

//Serialize document
var html = parse5.serialize(document);

//Serialize <body> element content
var bodyInnerHtml = parse5.serialize(document.childNodes[0].childNodes[1]);
```
