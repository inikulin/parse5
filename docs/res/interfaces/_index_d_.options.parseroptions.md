[](../README.md) > ["index.d"](../modules/_index_d_.md) > [Options](../modules/_index_d_.options.md) > [ParserOptions](../interfaces/_index_d_.options.parseroptions.md)

# Interface: ParserOptions

## Hierarchy

**ParserOptions**

## Index

### Properties

* [locationInfo](_index_d_.options.parseroptions.md#locationinfo)
* [treeAdapter](_index_d_.options.parseroptions.md#treeadapter)

---

## Properties

<a id="locationinfo"></a>

### `<Optional>` locationInfo

**● locationInfo**: *`boolean`*

Enables source code location information. When enabled, each node (except the root node) will have a `__location` property. If the node is not an empty element, `__location` will be a [MarkupData.ElementLocation](_index_d_.markupdata.elementlocation.md) object, otherwise it will be [MarkupData.Location](_index_d_.markupdata.location.md). If the element was implicitly created by the parser (as part of [tree correction](https://html.spec.whatwg.org/multipage/syntax.html#an-introduction-to-error-handling-and-strange-cases-in-the-parser)), its `__location` property will be `undefined`.

**Default:** `false`

___
<a id="treeadapter"></a>

### `<Optional>` treeAdapter

**● treeAdapter**: *[TreeAdapter](_index_d_.ast.treeadapter.md)*

Specifies the resulting tree format.

**Default:** `treeAdapters.default`

___

