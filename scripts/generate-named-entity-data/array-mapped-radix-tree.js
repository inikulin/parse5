import assert from 'node:assert';
import { Node } from './tree-node.js';

const HAS_DATA_FLAG = Math.trunc(1);
const DATA_DUPLET_FLAG = 1 << 1;
const HAS_BRANCHES_FLAG = 1 << 2;

const MAX_UINT16 = (1 << 16) - 1;
const MAX_BRANCH_MARKER_VALUE = HAS_DATA_FLAG | DATA_DUPLET_FLAG | HAS_BRANCHES_FLAG;

export class ArrayMappedRadixTree {
    constructor(radixTree) {
        this.arr = [];

        this._convertNode(radixTree);

        for (const n of this.arr) {
            assert(n <= MAX_UINT16, `${n} overflows uint16`);
        }

        return this.arr;
    }

    _convertEdge(edge) {
        for (const cp of edge.filter) {
            assert(cp > MAX_BRANCH_MARKER_VALUE, 'filter code point shadows node marker');
            this.arr.push(cp);
        }

        this._convertNode(edge.node);
    }

    _writeNodeMarker(data, branches) {
        let marker = 0;

        if (data) {
            marker |= HAS_DATA_FLAG;

            if (data.length === 2) {
                marker |= DATA_DUPLET_FLAG;
            }
        }

        if (branches) {
            marker |= HAS_BRANCHES_FLAG;
        }

        this.arr.push(marker);
    }

    _writeBranches(branches) {
        const kvPairs = Object.keys(branches)
            .map(Number)
            .map((key) => ({ key, branch: branches[key] }));

        const count = kvPairs.length;

        this.arr.push(count);

        const transitionTableIdx = this.arr.length;

        // NOTE: allocate space for transition table
        this.arr.length += count * 2;

        for (const [idx, pair] of kvPairs.sort((pair1, pair2) => pair1.key - pair2.key).entries()) {
            const keyIdx = transitionTableIdx + idx;
            const branchIdx = keyIdx + count;

            this.arr[keyIdx] = pair.key;
            this.arr[branchIdx] = this.arr.length;

            if (pair.branch instanceof Node) {
                this._convertNode(pair.branch);
            } else {
                this._convertEdge(pair.branch);
            }
        }
    }

    _convertNode(node) {
        const { data } = node;
        const { branches } = node;

        this._writeNodeMarker(data, branches);

        if (data) {
            for (const cp of data) {
                this.arr.push(cp);
            }
        }

        if (branches) {
            this._writeBranches(branches);
        }
    }
}
