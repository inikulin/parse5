# Interface: CommentNode

### Properties

* [data](#data)
* [name](#name)
* [next](#next)
* [nextSibling](#nextsibling)
* [nodeType](#nodetype)
* [nodeValue](#nodevalue)
* [parent](#parent)
* [parentNode](#parentnode)
* [prev](#prev)
* [previousSibling](#previoussibling)
* [sourceCodeLocation](#sourcecodelocation)
* [type](#type)

---

## Properties

<a id="data"></a>

###  data

**● data**: *`string`*

Comment text.

___
<a id="name"></a>

###  name

**● name**: *"comment"*

The name of the node.

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
<a id="nodevalue"></a>

###  nodeValue

**● nodeValue**: *`string`*

Same as [data](#data). [DOM spec](https://dom.spec.whatwg.org)-compatible alias.

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

**● sourceCodeLocation**: *[Location](../../parse5/docs/source-code-location/location.md)*

Comment source code location info. Available if location info is enabled via [ParserOptions](../../parse5/docs/options/parser-options.md).

___
<a id="type"></a>

###  type

**● type**: *`string`*

The type of the node. E.g. [Document](document.md) will have `type` equal to 'root'`.

___

