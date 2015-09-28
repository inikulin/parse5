<p align="center">
  <img src="https://raw.github.com/inikulin/parse5/master/logo.png" alt="parse5" />
</p>

[![Build Status](https://api.travis-ci.org/inikulin/parse5.svg)](https://travis-ci.org/inikulin/parse5)
[![npm](https://img.shields.io/npm/v/parse5.svg)](https://www.npmjs.com/package/parse5)

*WHATWG HTML5 specification-compliant, fast and ready for production HTML parsing/serialization toolset for Node and io.js.*

I needed fast and ready for production HTML parser, which will parse HTML as a modern browser's parser.
Existing solutions were either too slow or their output was too inaccurate. So, this is how parse5 was born.


## Included tools
#### Utilities
*   [parse](#class-parse) - parse HTML-document.
*   [parseFragment](#class-parsefragment) - parse HTML-fragment.
*   [serialize](#class-serialize) - serialize node to HTML.

#### Streaming (Node.js stream-compatible)
*   [ParserStream](#class-parserstream) - streaming HTML parser with scripting support.
*   [SAXParser](#class-saxparser) - [SAX](http://en.wikipedia.org/wiki/Simple_API_for_XML)-style parser for HTML.
*   [SerializerStream](#class-serializer) - streaimg node serializer.


## Install
```
$ npm install parse5
```


## Custom tree adapter
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


## Testing
Test data is adopted from [html5lib project](https://github.com/html5lib). Parser is covered by more than 10000 test cases.
To run tests:
```
$ gulp test
```


## Questions or suggestions?
If you have any questions, please feel free to create an issue [on github](https://github.com/inikulin/parse5/issues).


## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)
