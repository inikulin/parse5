[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [HtmlParser2](../modules/_index_d_.ast.htmlparser2.md) > [Node](../interfaces/_index_d_.ast.htmlparser2.node.md)

# Interface: Node

\[htmlparser2 tree adapter\]{@link parse5.treeAdapters} Node interface.

## Hierarchy

**Node**

↳  [ParentNode](_index_d_.ast.htmlparser2.parentnode.md)

↳  [DocumentType](_index_d_.ast.htmlparser2.documenttype.md)

↳  [CommentNode](_index_d_.ast.htmlparser2.commentnode.md)

↳  [TextNode](_index_d_.ast.htmlparser2.textnode.md)

## Index

### Properties

* [next](_index_d_.ast.htmlparser2.node.md#next)
* [nextSibling](_index_d_.ast.htmlparser2.node.md#nextsibling)
* [nodeType](_index_d_.ast.htmlparser2.node.md#nodetype)
* [parent](_index_d_.ast.htmlparser2.node.md#parent)
* [parentNode](_index_d_.ast.htmlparser2.node.md#parentnode)
* [prev](_index_d_.ast.htmlparser2.node.md#prev)
* [previousSibling](_index_d_.ast.htmlparser2.node.md#previoussibling)
* [type](_index_d_.ast.htmlparser2.node.md#type)

---

## Properties

<a id="next"></a>

###  next

**● next**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [next](_index_d_.ast.htmlparser2.node.md#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](_index_d_.ast.htmlparser2.node.md#type).

___
<a id="parent"></a>

###  parent

**● parent**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Same as [parent](_index_d_.ast.htmlparser2.node.md#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [prev](_index_d_.ast.htmlparser2.node.md#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](_index_d_.ast.htmlparser2.document.md) will have `type` equal to 'root'`.

___

