'use strict';

const Node = require('./tree-node');

class RadixTree {
    constructor(src) {
        this.root = new Node(null);

        for (const entity of Object.keys(src)) {
            this._addEntity(entity, src[entity].codepoints);
        }

        return this.root;
    }

    static _entityToCodePointsArray(entity) {
        return entity
            .replace(/^&/, '')
            .split('')
            .map(ch => ch.charCodeAt(0));
    }

    static _decoupleSurrogatePair(cp) {
        cp -= 0x10000;

        return [((cp >>> 10) & 0x3ff) | 0xd800, 0xdc00 | (cp & 0x3ff)];
    }

    // Before:
    //
    // {...}
    //
    //
    // After:
    //
    //              filter
    //           *--------- {data}
    //          /
    // {..., key}
    //
    //
    static _appendNewDataBranch(node, key, filter, data) {
        const newNode = new Node(data);

        if (filter.length) {
            node.addEdge(key, filter, newNode);
        } else {
            node.addNode(key, newNode);
        }
    }

    // Before:
    //
    //     filter
    // *------------ node
    //
    //
    // After:
    //
    //     commonPrefix
    // *[---------------] newNode
    //
    //
    //
    static _shortenEdgeAndAddNewNode(edge, newFilter, data) {
        const newNode = new Node(data);

        if (newFilter.length) {
            edge.filter = newFilter;
            edge.node = newNode;
        } else {
            edge.parent.addNode(edge.parentKey, newNode);
        }

        return newNode;
    }

    // Before:
    //
    //     filter
    // *------------ node
    //
    //
    // After:
    //
    //                                            oldNodeSuffix
    //                                        *------------------ node
    //   commonPrefix                        /
    // *[---------------] {newDataKey, oldNodeKey}
    //                          \
    //                           \     newDataSuffix
    //                            *------------------- {data}
    //
    //
    static _branchEdgeWithNewData(edge, commonPrefix, newDataKey, oldNodeKey, newDataSuffix, oldNodeSuffix, data) {
        const node = edge.node;
        const newDataNode = new Node(data);
        const branchNode = RadixTree._shortenEdgeAndAddNewNode(edge, commonPrefix, null);

        branchNode.addEdge(newDataKey, newDataSuffix, newDataNode);
        branchNode.addEdge(oldNodeKey, oldNodeSuffix, node);
    }

    // Before:
    //
    //     filter
    // *------------ node
    //
    //
    // After:
    //
    //     commonPrefix                        oldNodeSuffix
    // *[---------------] {data, oldNodeKey} ---------------- node
    //
    //
    //
    static _splitEdgeWithNewData(edge, commonPrefix, oldNodeKey, oldNodeSuffix, data) {
        const node = edge.node;
        const splitNode = RadixTree._shortenEdgeAndAddNewNode(edge, commonPrefix, data);

        splitNode.addEdge(oldNodeKey, oldNodeSuffix, node);
    }

    static _tryAddDataIntoEdge(edge, cps, i, data) {
        const commonPrefix = [];
        const filter = edge.filter;

        for (let j = 0; j < filter.length; j++, i++) {
            const filterCp = filter[j];

            // Edge is longer than current sequence. We need to insert intermediate node
            if (i === cps.length) {
                RadixTree._splitEdgeWithNewData(edge, commonPrefix, filterCp, filter.slice(j + 1), data);
                return null;
            }

            const cp = cps[i];

            if (cp === filterCp) {
                commonPrefix.push(cp);
            } else {
                RadixTree._branchEdgeWithNewData(
                    edge,
                    commonPrefix,
                    cp,
                    filterCp,
                    cps.slice(i + 1),
                    filter.slice(j + 1),
                    data
                );
                return null;
            }
        }

        return i - 1;
    }

    _addEntity(entity, data) {
        const cps = RadixTree._entityToCodePointsArray(entity);

        if (data.length === 1 && data[0] > 0xffff) {
            data = RadixTree._decoupleSurrogatePair(data[0]);
        }

        for (let i = 0, current = this.root; i < cps.length; i++) {
            const cp = cps[i];

            if (current instanceof Node) {
                const next = current.branches && current.branches[cp];

                // NOTE: Iterate to next node/edge
                if (next) {
                    current = next;
                }
                // NOTE: We can't iterate to next node, so we just create a new branch.
                else {
                    RadixTree._appendNewDataBranch(current, cp, cps.slice(i + 1), data);
                    break;
                }
            } else {
                const nextIdx = RadixTree._tryAddDataIntoEdge(current, cps, i, data);

                if (nextIdx !== null) {
                    // NOTE: We've passed through, nothing was added. Continue with next node.
                    i = nextIdx;
                    current = current.node;
                } else {
                    break;
                }
            }
        }
    }
}

module.exports = RadixTree;
