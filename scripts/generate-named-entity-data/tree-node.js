'use strict';

class Edge {
    constructor(filter, node, parent, parentKey) {
        this.filter = filter;
        this.node = node;
        this.parent = parent;
        this.parentKey = parentKey;
    }
}

class Node {
    constructor(data) {
        this.data = data;
        this.branches = null;
    }

    _ensureBranches() {
        if (!this.branches) {
            this.branches = Object.create(null);
        }
    }

    addEdge(key, filter, node) {
        this._ensureBranches();

        this.branches[key] = new Edge(filter, node, this, key);
    }

    addNode(key, node) {
        this._ensureBranches();

        this.branches[key] = node;
    }
}

module.exports = Node;
