# Interface: ParserOptions

### Properties

* [sourceCodeLocationInfo](#sourcecodelocationinfo)
* [scriptingEnabled](#scriptingenabled)
* [treeAdapter](#treeadapter)

---

## Properties

<a id="sourcecodelocationinfo"></a>

### `<Optional>` sourceCodeLocationInfo

**● sourceCodeLocationInfo**: *`boolean`*

Enables source code location information. When enabled, each node (except the root node) will have a `sourceCodeLocation` property (property name can be different depending on [tree adapter](../tree-adapter/interface.md) that has been used, hereinafter property names for the [DefaultTreeAdapter](../tree-adapter/interface-list.md) will be given). If the node is not an empty element, `sourceCodeLocation` will be a [ElementLocation](../source-code-location/element-location.md) object, otherwise it will be [Location](../source-code-location/location.md). If the element was implicitly created by the parser (as part of [tree correction](https://html.spec.whatwg.org/multipage/syntax.html#an-introduction-to-error-handling-and-strange-cases-in-the-parser)), its `sourceCodeLocation` property will be `undefined`.

**Default:** `false`

___
<a id="scriptingenabled"></a>

### `<Optional>` scriptingEnabled

**● scriptingEnabled**: *`boolean`*

The [scripting flag](https://html.spec.whatwg.org/multipage/parsing.html#scripting-flag). If set to
`true`, `noscript` element content will be parsed as text.

**Default:** `true`

___

<a id="treeadapter"></a>

### `<Optional>` treeAdapter

**● treeAdapter**: *[TreeAdapter](../tree-adapter/interface.md)*

Specifies the resulting tree format.

**Default:** [DefaultTreeAdapter](../tree-adapter/default/interface-list.md)

___

