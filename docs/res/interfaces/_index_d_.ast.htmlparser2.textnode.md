[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [HtmlParser2](../modules/_index_d_.ast.htmlparser2.md) > [TextNode](../interfaces/_index_d_.ast.htmlparser2.textnode.md)

# Interface: TextNode

\[htmlparser2 tree adapter\]{@link parse5.treeAdapters} TextNode interface.

## Hierarchy

 [Node](_index_d_.ast.htmlparser2.node.md)

**↳ TextNode**

## Index

### Properties

* [__location](_index_d_.ast.htmlparser2.textnode.md#__location)
* [data](_index_d_.ast.htmlparser2.textnode.md#data)
* [name](_index_d_.ast.htmlparser2.textnode.md#name)
* [next](_index_d_.ast.htmlparser2.textnode.md#next)
* [nextSibling](_index_d_.ast.htmlparser2.textnode.md#nextsibling)
* [nodeType](_index_d_.ast.htmlparser2.textnode.md#nodetype)
* [nodeValue](_index_d_.ast.htmlparser2.textnode.md#nodevalue)
* [parent](_index_d_.ast.htmlparser2.textnode.md#parent)
* [parentNode](_index_d_.ast.htmlparser2.textnode.md#parentnode)
* [prev](_index_d_.ast.htmlparser2.textnode.md#prev)
* [previousSibling](_index_d_.ast.htmlparser2.textnode.md#previoussibling)
* [type](_index_d_.ast.htmlparser2.textnode.md#type)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[Location](_index_d_.markupdata.location.md)*

Comment source code location info. Available if location info is enabled via [Options.ParserOptions](_index_d_.options.parseroptions.md).

___
<a id="data"></a>

###  data

**● data**: *`string`*

Text content.

___
<a id="name"></a>

###  name

**● name**: *"text"*

The name of the node.

___
<a id="next"></a>

###  next

**● next**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [next](_index_d_.ast.htmlparser2.textnode.md#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](_index_d_.ast.htmlparser2.textnode.md#type).

___
<a id="nodevalue"></a>

###  nodeValue

**● nodeValue**: *`string`*

Same as [data](_index_d_.ast.htmlparser2.textnode.md#data). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="parent"></a>

###  parent

**● parent**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Same as [parent](_index_d_.ast.htmlparser2.textnode.md#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [prev](_index_d_.ast.htmlparser2.textnode.md#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](_index_d_.ast.htmlparser2.document.md) will have `type` equal to 'root'`.

___

