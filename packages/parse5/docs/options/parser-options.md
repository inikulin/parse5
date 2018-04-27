# Interface: ParserOptions

### Properties

* [locationInfo](#locationinfo)
* [treeAdapter](#treeadapter)

---

## Properties

<a id="locationinfo"></a>

### `<Optional>` locationInfo

**● locationInfo**: *`boolean`*

Enables source code location information. When enabled, each node (except the root node) will have a `__location` property. If the node is not an empty element, `__location` will be a [ElementLocation](../source-code-location/element-location.md) object, otherwise it will be [Location](../source-code-location/location.md). If the element was implicitly created by the parser (as part of [tree correction](https://html.spec.whatwg.org/multipage/syntax.html#an-introduction-to-error-handling-and-strange-cases-in-the-parser)), its `__location` property will be `undefined`.

**Default:** `false`

___
<a id="treeadapter"></a>

### `<Optional>` treeAdapter

**● treeAdapter**: *[TreeAdapter](../tree-adapter/interface.md)*

Specifies the resulting tree format.

**Default:** [DefaultTreeAdapter](../tree-adapter/interface-list.md)

___

