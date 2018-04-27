[](../README.md) > ["index.d"](../modules/_index_d_.md)

# External module: "index.d"

## Index

### Modules

* [AST](_index_d_.ast.md)
* [MarkupData](_index_d_.markupdata.md)
* [Options](_index_d_.options.md)

### Classes

* [ParserStream](../classes/_index_d_.parserstream.md)
* [PlainTextConversionStream](../classes/_index_d_.plaintextconversionstream.md)
* [SAXParser](../classes/_index_d_.saxparser.md)
* [SerializerStream](../classes/_index_d_.serializerstream.md)

### Variables

* [treeAdapters](_index_d_.md#treeadapters)

### Functions

* [parse](_index_d_.md#parse)
* [parseFragment](_index_d_.md#parsefragment)
* [serialize](_index_d_.md#serialize)

---

## Variables

<a id="treeadapters"></a>

###  treeAdapters

**● treeAdapters**: *`object`*

Provides built-in tree adapters that can be used for parsing and serialization.
*__example__*:     
    const parse5 = require('parse5');
    
    // Uses the default tree adapter for parsing.
    const document = parse5.parse('<div></div>', {
        treeAdapter: parse5.treeAdapters.default
    });
    
    // Uses the htmlparser2 tree adapter with the SerializerStream.
    const serializer = new parse5.SerializerStream(node, {
        treeAdapter: parse5.treeAdapters.htmlparser2
    });

#### Type declaration

 default: [TreeAdapter](../interfaces/_index_d_.ast.treeadapter.md)

Default tree format for parse5.

 htmlparser2: [TreeAdapter](../interfaces/_index_d_.ast.treeadapter.md)

Quite popular [htmlparser2](https://github.com/fb55/htmlparser2) tree format (e.g. used by [cheerio](https://github.com/MatthewMueller/cheerio) and [jsdom](https://github.com/tmpvar/jsdom)).

___

## Functions

<a id="parse"></a>

###  parse

▸ **parse**(html: *`string`*, options?: *[ParserOptions](../interfaces/_index_d_.options.parseroptions.md)*): [Document](_index_d_.ast.md#document)

Parses an HTML string.
*__example__*:     
    const parse5 = require('parse5');
    
    const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
    
    console.log(document.childNodes[1].tagName); //> 'html'

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| html | `string` |  Input HTML string. |
| `Optional` options | [ParserOptions](../interfaces/_index_d_.options.parseroptions.md) |  Parsing options. |

**Returns:** [Document](_index_d_.ast.md#document)

___
<a id="parsefragment"></a>

###  parseFragment

▸ **parseFragment**(fragmentContext: *[Element](_index_d_.ast.md#element)*, html: *`string`*, options?: *[ParserOptions](../interfaces/_index_d_.options.parseroptions.md)*): [DocumentFragment](_index_d_.ast.md#documentfragment)

▸ **parseFragment**(html: *`string`*, options?: *[ParserOptions](../interfaces/_index_d_.options.parseroptions.md)*): [DocumentFragment](_index_d_.ast.md#documentfragment)

Parses an HTML fragment.
*__example__*:     
    const parse5 = require('parse5');
    
    const documentFragment = parse5.parseFragment('<table></table>');
    
    console.log(documentFragment.childNodes[0].tagName); //> 'table'
    
    // Parses the html fragment in the context of the parsed <table> element.
    const trFragment = parser.parseFragment(documentFragment.childNodes[0], '<tr><td>Shake it, baby</td></tr>');
    
    console.log(trFragment.childNodes[0].childNodes[0].tagName); //> 'td'

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| fragmentContext | [Element](_index_d_.ast.md#element) |  Parsing context element. If specified, given fragment will be parsed as if it was set to the context element's \`innerHTML\` property. |
| html | `string` |  Input HTML fragment string. |
| `Optional` options | [ParserOptions](../interfaces/_index_d_.options.parseroptions.md) |  Parsing options. |

**Returns:** [DocumentFragment](_index_d_.ast.md#documentfragment)

**Parameters:**

| Param | Type |
| ------ | ------ |
| html | `string` | 
| `Optional` options | [ParserOptions](../interfaces/_index_d_.options.parseroptions.md) | 

**Returns:** [DocumentFragment](_index_d_.ast.md#documentfragment)

___
<a id="serialize"></a>

###  serialize

▸ **serialize**(node: *[Node](_index_d_.ast.md#node)*, options?: *[SerializerOptions](../interfaces/_index_d_.options.serializeroptions.md)*): `string`

Serializes an AST node to an HTML string.
*__example__*:     
    const parse5 = require('parse5');
    
    const document = parse5.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>');
    
    // Serializes a document.
    const html = parse5.serialize(document);
    
    // Serializes the <html> element content.
    const str = parse5.serialize(document.childNodes[1]);
    
    console.log(str); //> '<head></head><body>Hi there!</body>'

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | [Node](_index_d_.ast.md#node) |  Node to serialize. |
| `Optional` options | [SerializerOptions](../interfaces/_index_d_.options.serializeroptions.md) |  Serialization options. |

**Returns:** `string`

___

