# FAQ

## Q: I want to work with my own document tree format. How can I achieve this?

You can create a custom tree adapter so parse5 can work with your own DOM-tree implementation.
Then just pass it to the parser or serializer via option:

```js
var parse5 = require('parse5');

var myTreeAdapter = {
   //Adapter methods...
};

var document = parse5.parse('<div></div>', { treeAdapter: myTreeAdapter });

var html = parse5.serialize(document, { treeAdapter: myTreeAdapter });
```
You can find description of the methods which should be exposed by tree adapter and links to their
default implementation in the [API reference](#TreeAdapter).
