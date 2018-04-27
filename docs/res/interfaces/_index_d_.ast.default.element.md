[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [Default](../modules/_index_d_.ast.default.md) > [Element](../interfaces/_index_d_.ast.default.element.md)

# Interface: Element

\[Default tree adapter\]{@link parse5.treeAdapters} Element interface.

## Hierarchy

 [ParentNode](_index_d_.ast.default.parentnode.md)

**↳ Element**

## Index

### Properties

* [__location](_index_d_.ast.default.element.md#__location)
* [attrs](_index_d_.ast.default.element.md#attrs)
* [childNodes](_index_d_.ast.default.element.md#childnodes)
* [namespaceURI](_index_d_.ast.default.element.md#namespaceuri)
* [nodeName](_index_d_.ast.default.element.md#nodename)
* [parentNode](_index_d_.ast.default.element.md#parentnode)
* [tagName](_index_d_.ast.default.element.md#tagname)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[ElementLocation](_index_d_.markupdata.elementlocation.md)*

Element source code location info. Available if location info is enabled via [Options.ParserOptions](_index_d_.options.parseroptions.md).

___
<a id="attrs"></a>

###  attrs

**● attrs**: *[Attribute](_index_d_.ast.default.attribute.md)[]*

List of element attributes.

___
<a id="childnodes"></a>

###  childNodes

**● childNodes**: *[Node](_index_d_.ast.default.node.md)[]*

Child nodes.

___
<a id="namespaceuri"></a>

###  namespaceURI

**● namespaceURI**: *`string`*

Element namespace.

___
<a id="nodename"></a>

###  nodeName

**● nodeName**: *`string`*

The name of the node. Equals to element [tagName](_index_d_.ast.default.element.md#tagname).

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.default.parentnode.md)*

Parent node.

___
<a id="tagname"></a>

###  tagName

**● tagName**: *`string`*

Element tag name.

___

