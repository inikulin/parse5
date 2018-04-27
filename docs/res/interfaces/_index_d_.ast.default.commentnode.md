[](../README.md) > ["index.d"](../modules/_index_d_.md) > [AST](../modules/_index_d_.ast.md) > [Default](../modules/_index_d_.ast.default.md) > [CommentNode](../interfaces/_index_d_.ast.default.commentnode.md)

# Interface: CommentNode

\[Default tree adapter\]{@link parse5.treeAdapters} CommentNode interface.

## Hierarchy

 [Node](_index_d_.ast.default.node.md)

**↳ CommentNode**

## Index

### Properties

* [__location](_index_d_.ast.default.commentnode.md#__location)
* [data](_index_d_.ast.default.commentnode.md#data)
* [nodeName](_index_d_.ast.default.commentnode.md#nodename)
* [parentNode](_index_d_.ast.default.commentnode.md#parentnode)

---

## Properties

<a id="__location"></a>

### `<Optional>` __location

**● __location**: *[Location](_index_d_.markupdata.location.md)*

Comment source code location info. Available if location info is enabled via [Options.ParserOptions](_index_d_.options.parseroptions.md).

___
<a id="data"></a>

###  data

**● data**: *`string`*

Comment text.

___
<a id="nodename"></a>

###  nodeName

**● nodeName**: *"#comment"*

The name of the node.

___
<a id="parentnode"></a>

###  parentNode

**● parentNode**: *[ParentNode](_index_d_.ast.default.parentnode.md)*

Parent node.

___

