[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [HtmlParser2](../modules/_index_d_.ast.htmlparser2.md) > [Element](../interfaces/_index_d_.ast.htmlparser2.element.md)

# Interface: Element

\[htmlparser2 tree adapter\]{@link parse5.treeAdapters} Element interface.

## Hierarchy

↳  [ParentNode](_index_d_.ast.htmlparser2.parentnode.md)

**↳ Element**

## Index

### Properties

* [__location](_index_d_.ast.htmlparser2.element.md#__location)
* [attribs](_index_d_.ast.htmlparser2.element.md#attribs)
* [childNodes](_index_d_.ast.htmlparser2.element.md#childnodes)
* [children](_index_d_.ast.htmlparser2.element.md#children)
* [firstChild](_index_d_.ast.htmlparser2.element.md#firstchild)
* [lastChild](_index_d_.ast.htmlparser2.element.md#lastchild)
* [name](_index_d_.ast.htmlparser2.element.md#name)
* [namespace](_index_d_.ast.htmlparser2.element.md#namespace)
* [next](_index_d_.ast.htmlparser2.element.md#next)
* [nextSibling](_index_d_.ast.htmlparser2.element.md#nextsibling)
* [nodeType](_index_d_.ast.htmlparser2.element.md#nodetype)
* [parent](_index_d_.ast.htmlparser2.element.md#parent)
* [parentNode](_index_d_.ast.htmlparser2.element.md#parentnode)
* [prev](_index_d_.ast.htmlparser2.element.md#prev)
* [previousSibling](_index_d_.ast.htmlparser2.element.md#previoussibling)
* [tagName](_index_d_.ast.htmlparser2.element.md#tagname)
* [type](_index_d_.ast.htmlparser2.element.md#type)
* [x-attribsNamespace](_index_d_.ast.htmlparser2.element.md#x_attribsnamespace)
* [x-attribsPrefix](_index_d_.ast.htmlparser2.element.md#x_attribsprefix)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[ElementLocation](_index_d_.markupdata.elementlocation.md)*

Element source code location info. Available if location info is enabled via [Options.ParserOptions](_index_d_.options.parseroptions.md).

___
<a id="attribs"></a>

###  attribs

**● attribs**: *`object`*

Element attributes.

#### Type declaration

[name: `string`]: `string`

___
<a id="childnodes"></a>

###  childNodes

**● childNodes**: *[Node](_index_d_.ast.htmlparser2.node.md)[]*

Same as [children](_index_d_.ast.htmlparser2.element.md#children). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

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
<a id="name"></a>

###  name

**● name**: *`string`*

The name of the node. Equals to element [tagName](_index_d_.ast.htmlparser2.element.md#tagname).

___
<a id="namespace"></a>

###  namespace

**● namespace**: *`string`*

Element namespace.

___
<a id="next"></a>

###  next

**● next**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [next](_index_d_.ast.htmlparser2.element.md#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](_index_d_.ast.htmlparser2.element.md#type).

___
<a id="parent"></a>

###  parent

**● parent**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.htmlparser2.parentnode.md)*

Same as [parent](_index_d_.ast.htmlparser2.element.md#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *[Node](_index_d_.ast.htmlparser2.node.md)*

Same as [prev](_index_d_.ast.htmlparser2.element.md#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="tagname"></a>

###  tagName

**● tagName**: *`string`*

Element tag name.

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](_index_d_.ast.htmlparser2.document.md) will have `type` equal to 'root'`.

___
<a id="x_attribsnamespace"></a>

###  x-attribsNamespace

**● x-attribsNamespace**: *`object`*

Element attribute namespaces.

#### Type declaration

[name: `string`]: `string`

___
<a id="x_attribsprefix"></a>

###  x-attribsPrefix

**● x-attribsPrefix**: *`object`*

Element attribute namespace-related prefixes.

#### Type declaration

[name: `string`]: `string`

___

