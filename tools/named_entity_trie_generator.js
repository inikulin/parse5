var fs = require('fs'),
    path = require('path');

var fileData = fs.readFileSync(path.join(__dirname, 'entities.json')).toString(),
    entitiesData = JSON.parse(fileData);

var trie = Object.keys(entitiesData).reduce(function (trie, entity) {
    var resultCp = entitiesData[entity].codepoints;

    entity = entity.replace(/^&/, '');

    var entityLength = entity.length,
        last = entityLength - 1,
        leaf = trie;

    for (var i = 0; i < entityLength; i++) {
        var key = entity.charCodeAt(i);

        if (!leaf[key])
            leaf[key] = {};

        if (i === last)
            leaf[key].c = resultCp;

        else {
            if (!leaf[key].l)
                leaf[key].l = {};

            leaf = leaf[key].l;
        }
    }

    return trie;
}, {});


var outData =
    '\'use strict\';\n\n' +
    '//NOTE: this file contains auto generated trie structure that is used for named entity references consumption\n' +
    '//(see: http://www.whatwg.org/specs/web-apps/current-work/multipage/tokenization.html#tokenizing-character-references and\n' +
    '//http://www.whatwg.org/specs/web-apps/current-work/multipage/named-character-references.html#named-character-references)\n' +
    'module.exports = ' + JSON.stringify(trie).replace(/"/g, '') + ';\n';

fs.writeFileSync(path.join(__dirname, '../lib/tokenization/named_entity_trie.js'), outData);
