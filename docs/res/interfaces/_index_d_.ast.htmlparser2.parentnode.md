[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [HtmlParser2](../modules/_index_d_.ast.htmlparser2.md) > [ParentNode](../interfaces/_index_d_.ast.htmlparser2.parentnode.md)

# Interface: ParentNode

\[htmlparser2 tree adapter\]{@link parse5.treeAdapters} ParentNode interface.

## Hierarchy

 [Node](_index_d_.ast.htmlparser2.node.md)

**↳ ParentNode**

↳  [Document](_index_d_.ast.htmlparser2.document.md)

↳  [DocumentFragment](_index_d_.ast.htmlparser2.documentfragment.md)

↳  [Element](_index_d_.ast.htmlparser2.element.md)

## Index

### Properties

* [childNodes](_index_d_.ast.htmlparser2.parentnode.md#childnodes)
* [children](_index_d_.ast.htmlparser2.parentnode.md#children)
* [firstChild](_index_d_.ast.htmlparser2.parentnode.md#firstchild)
* [lastChild](_index_d_.ast.htmlparser2.parentnode.md#lastchild)
* [next](_index_d_.ast.htmlparser2.parentnode.md#next)
* [nextSibling](_index_d_.ast.htmlparser2.parentnode.md#nextsibling)
* [nodeType](_index_d_.ast.htmlparser2.parentnode.md#nodetype)
* [parent](_index_d_.ast.htmlparser2.parentnode.md#parent)
* [parentNode](_index_d_.ast.htmlparser2.parentnode.md#parentnode)
* [prev](_index_d_.ast.htmlparser2.parentnode.md#prev)
* [previousSibling](_index_d_.ast.htmlparser2.parentnode.md#previoussibling)
* [type](_index_d_.ast.htmlparser2.parentnode.md#type)

---

## Properties

<a id="childnodes"></a>

###  childNodes

**● childNodes**: *[Node](_index_d_.ast.htmlparser2.node.md)[]*

Same as [children](_index_d_.ast.htmlparser2.parentnode.md#children). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="children"></a>

###  children

**● children**: *[Node](_index_d_.ast.htmlparser2.node.md)[]*

Child nodes.

___
<a id="firstchild"></a>

###  firstChild

**● firstChild**: *[Node](_index_d_.ast.htmlparser2.node.md)*

First child of the node.

___
<a id="lastchild"></a>

###  lastChild

**● lastChild**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Last child of the node.

___
<a id="next"></a>

###  next

**● next**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [next](_index_d_.ast.htmlparser2.parentnode.md#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](_index_d_.ast.htmlparser2.parentnode.md#type).

___
<a id="parent"></a>

###  parent

**● parent**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Same as [parent](_index_d_.ast.htmlparser2.parentnode.md#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [prev](_index_d_.ast.htmlparser2.parentnode.md#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](_index_d_.ast.htmlparser2.document.md) will have `type` equal to 'root'`.

___

