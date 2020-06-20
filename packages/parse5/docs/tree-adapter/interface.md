# Interface: TreeAdapter

Tree adapter is a set of utility functions that provides minimal required abstraction layer beetween parser and a specific AST format. Note that `TreeAdapter` is not designed to be a general purpose AST manipulation library. You can build such library on top of existing `TreeAdapter` or use one of the existing libraries from npm.

*__See__*: [default implementation](https://github.com/inikulin/parse5/blob/master/packages/parse5/lib/tree-adapters/default.js)

### Methods

* [adoptAttributes](#adoptattributes)
* [appendChild](#appendchild)
* [createCommentNode](#createcommentnode)
* [createDocument](#createdocument)
* [createDocumentFragment](#createdocumentfragment)
* [createElement](#createelement)
* [detachNode](#detachnode)
* [getAttrList](#getattrlist)
* [getChildNodes](#getchildnodes)
* [getCommentNodeContent](#getcommentnodecontent)
* [getDocumentMode](#getdocumentmode)
* [getDocumentTypeNodeName](#getdocumenttypenodename)
* [getDocumentTypeNodePublicId](#getdocumenttypenodepublicid)
* [getDocumentTypeNodeSystemId](#getdocumenttypenodesystemid)
* [getFirstChild](#getfirstchild)
* [getNamespaceURI](#getnamespaceuri)
* [getNodeSourceCodeLocation](#getnodesourcecodelocation)
* [getParentNode](#getparentnode)
* [getTagName](#gettagname)
* [getTemplateContent](#gettemplatecontent)
* [getTextNodeContent](#gettextnodecontent)
* [insertBefore](#insertbefore)
* [insertText](#inserttext)
* [insertTextBefore](#inserttextbefore)
* [isCommentNode](#iscommentnode)
* [isDocumentTypeNode](#isdocumenttypenode)
* [isElementNode](#iselementnode)
* [isTextNode](#istextnode)
* [setDocumentMode](#setdocumentmode)
* [setDocumentType](#setdocumenttype)
* [setNodeSourceCodeLocation](#setnodesourcecodelocation)
* [setTemplateContent](#settemplatecontent)
* [updateNodeSourceCodeLocation](#updatenodesourcecodelocation)
---

## Methods

<a id="adoptattributes"></a>

###  adoptAttributes

▸ **adoptAttributes**(recipient: *Element*, attrs: *Attribute[]*): `void`

Copies attributes to the given element. Only attributes that are not yet present in the element are copied.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| recipient | Element |  Element to copy attributes into. |
| attrs | Attribute[] |  Attributes to copy. |

**Returns:** `void`

___
<a id="appendchild"></a>

###  appendChild

▸ **appendChild**(parentNode: *Node*, newNode: *Node*): `void`

Appends a child node to the given parent node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| parentNode | ParentNode |  Parent node. |
| newNode | Node |  Child node. |

**Returns:** `void`

___
<a id="createcommentnode"></a>

###  createCommentNode

▸ **createCommentNode**(data: *`string`*): CommentNode

Creates a comment node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| data | `string` |  Comment text. |

**Returns:** CommentNode

___
<a id="createdocument"></a>

###  createDocument

▸ **createDocument**(): Document

Creates a document node.

**Returns:** Document

___
<a id="createdocumentfragment"></a>

###  createDocumentFragment

▸ **createDocumentFragment**(): DocumentFragment

Creates a document fragment node.

**Returns:** DocumentFragment

___
<a id="createelement"></a>

###  createElement

▸ **createElement**(tagName: *`string`*, namespaceURI: *`string`*, attrs: *Attribute[]*): Element

Creates an element node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| tagName | `string` |  Tag name of the element. |
| namespaceURI | `string` |  Namespace of the element. |
| attrs | Attribute[] |  Attribute name-value pair array. Foreign attributes may contain \`namespace\` and \`prefix\` fields as well. |

**Returns:** Element

___
<a id="detachnode"></a>

###  detachNode

▸ **detachNode**(node: *Node*): `void`

Removes a node from its parent.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node to remove. |

**Returns:** `void`

___
<a id="getattrlist"></a>

###  getAttrList

▸ **getAttrList**(element: *Element*): Attribute[]

Returns the given element's attributes in an array, in the form of name-value pairs. Foreign attributes may contain `namespace` and `prefix` fields as well.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| element | Element |  Element. |

**Returns:** Attribute[]

___
<a id="getchildnodes"></a>

###  getChildNodes

▸ **getChildNodes**(node: *Node*): Node[]

Returns the given node's children in an array.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | ParentNode |  Node. |

**Returns:** Node[]

___
<a id="getcommentnodecontent"></a>

###  getCommentNodeContent

▸ **getCommentNodeContent**(commentNode: *CommentNode*): `string`

Returns the given comment node's content.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| commentNode | CommentNode |  Comment node. |

**Returns:** `string`

___
<a id="getdocumentmode"></a>

###  getDocumentMode

▸ **getDocumentMode**(document: *Document*): *"no-quirks" | "quirks" | "limited-quirks"*

Returns [document mode](https://dom.spec.whatwg.org/#concept-document-limited-quirks).

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| document | Document |  Document node. |

**Returns:** *"no-quirks" | "quirks" | "limited-quirks"*

___
<a id="getdocumenttypenodename"></a>

###  getDocumentTypeNodeName

▸ **getDocumentTypeNodeName**(doctypeNode: *DocumentType*): `string`

Returns the given document type node's name.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doctypeNode | DocumentType |  Document type node. |

**Returns:** `string`

___
<a id="getdocumenttypenodepublicid"></a>

###  getDocumentTypeNodePublicId

▸ **getDocumentTypeNodePublicId**(doctypeNode: *DocumentType*): `string`

Returns the given document type node's public identifier.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doctypeNode | DocumentType |  Document type node. |

**Returns:** `string`

___
<a id="getdocumenttypenodesystemid"></a>

###  getDocumentTypeNodeSystemId

▸ **getDocumentTypeNodeSystemId**(doctypeNode: *DocumentType*): `string`

Returns the given document type node's system identifier.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| doctypeNode | DocumentType |  Document type node. |

**Returns:** `string`

___
<a id="getfirstchild"></a>

###  getFirstChild

▸ **getFirstChild**(node: *Node*): Node

Returns the first child of the given node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | ParentNode |  Node. |

**Returns:** Node

___
<a id="getnamespaceuri"></a>

###  getNamespaceURI

▸ **getNamespaceURI**(element: *Element*): `string`

Returns the given element's namespace.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| element | Element |  Element. |

**Returns:** `string`

___
<a id="getnodesourcecodelocation"></a>

###  getNodeSourceCodeLocation

▸ **getNodeSourceCodeLocation**(node: *Node*): [Location](../source-code-location/location.md) | [ElementLocation](../source-code-location/element-location.md)

Returns the given node's source code location information.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** [Location](../source-code-location/location.md) | [ElementLocation](../source-code-location/element-location.md)

___
<a id="getparentnode"></a>

###  getParentNode

▸ **getParentNode**(node: *Node*): ParentNode

Returns the given node's parent.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** ParentNode

___
<a id="gettagname"></a>

###  getTagName

▸ **getTagName**(element: *Element*): `string`

Returns the given element's tag name.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| element | Element |  Element. |

**Returns:** `string`

___
<a id="gettemplatecontent"></a>

###  getTemplateContent

▸ **getTemplateContent**(templateElement: *Element*): DocumentFragment

Returns the `<template>` element content element.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| templateElement | Element |  `<template>` element. |

**Returns:** DocumentFragment

___
<a id="gettextnodecontent"></a>

###  getTextNodeContent

▸ **getTextNodeContent**(textNode: *TextNode*): `string`

Returns the given text node's content.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| textNode | TextNode |  Text node. |

**Returns:** `string`

___
<a id="insertbefore"></a>

###  insertBefore

▸ **insertBefore**(parentNode: *Node*, newNode: *Node*, referenceNode: *Node*): `void`

Inserts a child node to the given parent node before the given reference node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| parentNode | ParentNode |  Parent node. |
| newNode | Node |  Child node. |
| referenceNode | Node |  Reference node. |

**Returns:** `void`

___
<a id="inserttext"></a>

###  insertText

▸ **insertText**(parentNode: *Node*, text: *`string`*): `void`

Inserts text into a node. If the last child of the node is a text node, the provided text will be appended to the text node content. Otherwise, inserts a new text node with the given text.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| parentNode | ParentNode |  Node to insert text into. |
| text | `string` |  Text to insert. |

**Returns:** `void`

___
<a id="inserttextbefore"></a>

###  insertTextBefore

▸ **insertTextBefore**(parentNode: *Node*, text: *`string`*, referenceNode: *Node*): `void`

Inserts text into a sibling node that goes before the reference node. If this sibling node is the text node, the provided text will be appended to the text node content. Otherwise, inserts a new sibling text node with the given text before the reference node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| parentNode | ParentNode |  Node to insert text into. |
| text | `string` |  Text to insert. |
| referenceNode | Node |  Node to insert text before. |

**Returns:** `void`

___
<a id="iscommentnode"></a>

###  isCommentNode

▸ **isCommentNode**(node: *Node*): `boolean`

Determines if the given node is a comment node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** `boolean`

___
<a id="isdocumenttypenode"></a>

###  isDocumentTypeNode

▸ **isDocumentTypeNode**(node: *Node*): `boolean`

Determines if the given node is a document type node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** `boolean`

___
<a id="iselementnode"></a>

###  isElementNode

▸ **isElementNode**(node: *Node*): `boolean`

Determines if the given node is an element.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** `boolean`

___
<a id="istextnode"></a>

###  isTextNode

▸ **isTextNode**(node: *Node*): `boolean`

Determines if the given node is a text node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |

**Returns:** `boolean`

___
<a id="setdocumentmode"></a>

###  setDocumentMode

▸ **setDocumentMode**(document: *Document*, mode: *"no-quirks" | "quirks" | "limited-quirks"*): `void`

Sets the [document mode](https://dom.spec.whatwg.org/#concept-document-limited-quirks).

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| document | Document |  Document node. |
| mode | *"no-quirks" | "quirks" | "limited-quirks"* |  Document mode. |

**Returns:** `void`

___
<a id="setdocumenttype"></a>

###  setDocumentType

▸ **setDocumentType**(document: *Document*, name: *`string`*, publicId: *`string`*, systemId: *`string`*): `void`

Sets the document type. If the `document` already contains a document type node, the `name`, `publicId` and `systemId` properties of this node will be updated with the provided values. Otherwise, creates a new document type node with the given properties and inserts it into the `document`.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| document | Document |  Document node. |
| name | `string` |  Document type name. |
| publicId | `string` |  Document type public identifier. |
| systemId | `string` |  Document type system identifier. |

**Returns:** `void`

___
<a id="setnodesourcecodelocation"></a>

###  setNodeSourceCodeLocation

▸ **setNodeSourceCodeLocation**(node: *Node*, location: *[Location](../source-code-location/location.md) | [ElementLocation](../source-code-location/element-location.md)*): `void`

Attaches source code location information to the node.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |
| location | [Location](../source-code-location/location.md) | [ElementLocation](../source-code-location/element-location.md) |  Source code location information. |

**Returns:** `void`

___
<a id="settemplatecontent"></a>

###  setTemplateContent

▸ **setTemplateContent**(templateElement: *Element*, contentElement: *DocumentFragment*): `void`

Sets the `<template>` element content element.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| templateElement | Element |  `<template>` element. |
| contentElement | DocumentFragment |  Content element. |

**Returns:** `void`
___
<a id="updatenodesourcecodelocation"></a>

###  updateNodeSourceCodeLocation

▸ **updateNodeSourceCodeLocation**(node: *Node*, endLocation: *[EndLocation](../source-code-location/end-location.md)*): `void`

Updates the source code location of nodes.

**Parameters:**

| Param | Type | Description |
| ------ | ------ | ------ |
| node | Node |  Node. |
| endLocation | [EndLocation](../source-code-location/end-location.md) |  Source code location information of the end of the node. |

**Returns:** `void`
___
