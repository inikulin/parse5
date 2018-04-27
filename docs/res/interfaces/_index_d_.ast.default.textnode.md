[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [Default](../modules/_index_d_.ast.default.md) > [TextNode](../interfaces/_index_d_.ast.default.textnode.md)

# Interface: TextNode

\[Default tree adapter\]{@link parse5.treeAdapters} TextNode interface.

## Hierarchy

 [Node](_index_d_.ast.default.node.md)

**↳ TextNode**

## Index

### Properties

* [__location](_index_d_.ast.default.textnode.md#__location)
* [nodeName](_index_d_.ast.default.textnode.md#nodename)
* [parentNode](_index_d_.ast.default.textnode.md#parentnode)
* [value](_index_d_.ast.default.textnode.md#value)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[Location](_index_d_.markupdata.location.md)*

Text node source code location info. Available if location info is enabled via [Options.ParserOptions](_index_d_.options.parseroptions.md).

___
<a id="nodename"></a>

###  nodeName

**● nodeName**: *"#text"*

The name of the node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.default.parentnode.md)*

Parent node.

___
<a id="value"></a>

###  value

**● value**: *`string`*

Text content.

___

