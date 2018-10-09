# Interface: SerializerOptions

### Properties

* [treeAdapter](#treeadapter)

---

## Properties

<a id="escapeString"></a>

### `<Optional>` escapeString

**● escapeString**: *function(str, attrMode)*

Callback for custom escaping behavior. Should return the desired version of `str`,
considering `attrMode` indicating whether the string occurred inside an attribute.

**Default:** `Serializer.escapeString`

<a id="treeadapter"></a>

### `<Optional>` treeAdapter

**● treeAdapter**: *[TreeAdapter](../tree-adapter/interface.md)*

Specifies input tree format.

**Default:** [DefaultTreeAdapter](../tree-adapter/default/interface-list.md).

___

