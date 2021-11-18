# Interface: Element

### Properties

* [attribs](#attribs)
* [childNodes](#childnodes)
* [children](#children)
* [firstChild](#firstchild)
* [lastChild](#lastchild)
* [name](#name)
* [namespace](#namespace)
* [next](#next)
* [nextSibling](#nextsibling)
* [nodeType](#nodetype)
* [parent](#parent)
* [parentNode](#parentnode)
* [prev](#prev)
* [previousSibling](#previoussibling)
* [sourceCodeLocation](#sourcecodelocation)
* [tagName](#tagname)
* [type](#type)
* [x-attribsNamespace](#x_attribsnamespace)
* [x-attribsPrefix](#x_attribsprefix)

---

## Properties

<a id="attribs"></a>

###  attribs

**● attribs**: *`object`*

Element attributes.

#### Type declaration

[name: `string`]: `string`

___
<a id="childnodes"></a>

###  childNodes

**● childNodes**: *Node[]*

Same as [children](#children). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="children"></a>

###  children

**● children**: *Node[]*

Child nodes.

___
<a id="firstchild"></a>

###  firstChild

**● firstChild**: *Node*

First child of the node.

___
<a id="lastchild"></a>

###  lastChild

**● lastChild**: *Node*

Last child of the node.

___
<a id="name"></a>

###  name

**● name**: *`string`*

The name of the node. Equals to element [tagName](#tagname).

___
<a id="namespace"></a>

###  namespace

**● namespace**: *`string`*

Element namespace.

___
<a id="next"></a>

###  next

**● next**: *Node*

Next sibling.

___
<a id="nextsibling"></a>

###  nextSibling

**● nextSibling**: *Node*

Same as [next](#next). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="nodetype"></a>

###  nodeType

**● nodeType**: *`number`*

[DOM spec](https://dom.spec.whatwg.org/#dom-node-nodetype)-compatible node [type](#type).

___
<a id="parent"></a>

###  parent

**● parent**: *Node*

Parent node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *Node*

Same as [parent](#parent). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="prev"></a>

###  prev

**● prev**: *Node*

Previous sibling.

___
<a id="previoussibling"></a>

###  previousSibling

**● previousSibling**: *Node*

Same as [prev](#prev). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

___
<a id="sourcecodelocation"></a>

### `<Optional>` sourceCodeLocation

**● sourceCodeLocation**: *[ElementLocation](../../parse5/docs/element-location.md)*

Element source code location info. Available if location info is enabled via [ParserOptions](../../parse5/docs/parser-options.md).

___
<a id="tagname"></a>

###  tagName

**● tagName**: *`string`*

Element tag name.

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](document.md) will have `type` equal to 'root'`.

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

