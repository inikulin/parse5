[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [HtmlParser2](../modules/_index_d_.ast.htmlparser2.md) > [DocumentType](../interfaces/_index_d_.ast.htmlparser2.documenttype.md)

# Interface: DocumentType

\[htmlparser2 tree adapter\]{@link parse5.treeAdapters} DocumentType interface.

## Hierarchy

 [Node](_index_d_.ast.htmlparser2.node.md)

**↳ DocumentType**

## Index

### Properties

* [data](_index_d_.ast.htmlparser2.documenttype.md#data)
* [name](_index_d_.ast.htmlparser2.documenttype.md#name)
* [next](_index_d_.ast.htmlparser2.documenttype.md#next)
* [nextSibling](_index_d_.ast.htmlparser2.documenttype.md#nextsibling)
* [nodeType](_index_d_.ast.htmlparser2.documenttype.md#nodetype)
* [parent](_index_d_.ast.htmlparser2.documenttype.md#parent)
* [parentNode](_index_d_.ast.htmlparser2.documenttype.md#parentnode)
* [prev](_index_d_.ast.htmlparser2.documenttype.md#prev)
* [previousSibling](_index_d_.ast.htmlparser2.documenttype.md#previoussibling)
* [type](_index_d_.ast.htmlparser2.documenttype.md#type)
* [x-name](_index_d_.ast.htmlparser2.documenttype.md#x_name)
* [x-publicId](_index_d_.ast.htmlparser2.documenttype.md#x_publicid)
* [x-systemId](_index_d_.ast.htmlparser2.documenttype.md#x_systemid)

---

## Properties

<a id="data"></a>

###  data

**● data**: *`string`*

Serialized doctype [name](_index_d_.ast.htmlparser2.documenttype.md#name), {@link publicId} and {@link systemId}.

___
<a id="name"></a>

###  name

**● name**: *"!doctype"*

Node name.

___
<a id="next"></a>

###  next

**● next**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [next](_index_d_.ast.htmlparser2.documenttype.md#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](_index_d_.ast.htmlparser2.documenttype.md#type).

___
<a id="parent"></a>

###  parent

**● parent**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Same as [parent](_index_d_.ast.htmlparser2.documenttype.md#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [prev](_index_d_.ast.htmlparser2.documenttype.md#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="type"></a>

###  type

**● type**: *"directive"*

The type of the node.

___
<a id="x_name"></a>

###  x-name

**● x-name**: *`string`*

Document type name.

___
<a id="x_publicid"></a>

###  x-publicId

**● x-publicId**: *`string`*

Document type public identifier.

___
<a id="x_systemid"></a>

###  x-systemId

**● x-systemId**: *`string`*

Document type system identifier.

___

