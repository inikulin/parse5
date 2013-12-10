parse5
======
Fast full-featured HTML parser for Node. Based on WHATWG HTML5 specification.  
To build [TestCafé](http://testcafe.devexpress.com/) we needed fast and ready for production HTML parser for node.js, which will parse HTML as a modern browser's parser.
Existing solutions were either too slow or their output was too inaccurate. So, this is how parse5 was born.

Install
-------
```
$ npm install parse5
```

Usage and API
-------------
```js
var Parser = require('parse5').Parser;

//Instantiate parser
var parser = new Parser();

//Then feed it with an HTML document
var document = parser.parse('<!DOCTYPE html><html><head></head><body>Hi there!</body></html>')

//Now let's parse HTML-snippet
var fragment = parser.parseFragment('<title>Parse5 is &#102;&#117;&#99;&#107;ing awesome!</title><h1>42</h1>');

```

Is it fast?
-----------
Check out [this benchmark](https://github.com/inikulin/node-html-parser-bench).

```
Starting benchmark. Fasten your seatbelts...
html5 (https://github.com/aredridel/html5) x 0.18 ops/sec ±5.92% (5 runs sampled)
htmlparser (https://github.com/tautologistics/node-htmlparser/) x 3.83 ops/sec ±42.43% (14 runs sampled)
htmlparser2 (https://github.com/fb55/htmlparser2) x 4.05 ops/sec ±39.27% (15 runs sampled)
parse5 (https://github.com/inikulin/parse5) x 3.04 ops/sec ±51.81% (13 runs sampled)
Fastest is htmlparser2 (https://github.com/fb55/htmlparser2),parse5 (https://github.com/inikulin/parse5)
```

So, parse5 is as fast as simple specification incompatible parsers and ~15-times(!) faster than the current specification compatible parser available for the node.

Testing
-------
Test data is adopted from [html5lib project](https://github.com/html5lib). Parser is covered by more than 8000 test cases.
To run tests:
```
$ node test/run_tests.js
```

Custom tree adapter
-------------------
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

Sample implementation can be found [here](https://github.com/inikulin/parse5/blob/master/lib/default_tree_adapter.js).
The custom tree adapter should implement all methods exposed via `exports` in the sample implementation.

Questions or suggestions?
-------------------------
If you have any questions, please feel free to create an issue [here on github](https://github.com/inikulin/parse5/issues).

Author
------
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/inikulin/parse5/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

