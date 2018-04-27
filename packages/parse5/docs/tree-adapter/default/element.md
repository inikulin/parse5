# Interface: Element

### Properties

* [__location](#__location)
* [attrs](#attrs)
* [childNodes](#childnodes)
* [namespaceURI](#namespaceuri)
* [nodeName](#nodename)
* [parentNode](#parentnode)
* [tagName](#tagname)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[ElementLocation](../../source-code-location/element-location.md)*

Element source code location info. Available if location info is enabled via [ParserOptions](../../options/parser-options.md).

___
<a id="attrs"></a>

###  attrs

**● attrs**: *[Attribute](attribute.md)[]*

List of element attributes.

___
<a id="childnodes"></a>

###  childNodes

**● childNodes**: *Node[]*

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

The name of the node. Equals to element [tagName](#tagname).

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *Node*

Parent node.

___
<a id="tagname"></a>

###  tagName

**● tagName**: *`string`*

Element tag name.

___

