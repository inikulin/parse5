# Usage
```js
var parse5 = require('parse5');

var document     = parse5.parse('<!DOCTYPE html><html><body>Hi there!</body></html>');
var documentHtml = parse5.serialize(document);


var fragment     = parse5.parseFragment('<td>Yo!</td>');
var fragmentHtml = parse5.serialize(fragment);
```
For more advanced examples see [API reference](#api-reference) and [FAQ](#faq).
