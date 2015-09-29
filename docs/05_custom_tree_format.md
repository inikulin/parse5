# Custom tree format
You can create a custom tree adapter so parse5 can work with your own DOM-tree implementation.
Just pass your adapter implementation to the parser's constructor as an argument:

```js
var Parser = require('parse5').Parser;

var myTreeAdapter = {
   //Adapter methods...
};

//Instantiate parser
var parser = new Parser(myTreeAdapter);
```

Sample implementation can be found [here](https://github.com/inikulin/parse5/blob/master/lib/tree_adapters/default.js).
The custom tree adapter should implement all methods exposed via `exports` in the sample implementation.
