import { Mixin } from '../../utils/mixin.js';
import type { OpenElementStack } from './../../parser/open-element-stack';
import type { TreeAdapterTypeMap } from './../../tree-adapters/interface';

interface LocationInfoOpenElementStackMixinOptions<T extends TreeAdapterTypeMap> {
    onItemPop: (item: T['parentNode']) => void;
}

export class LocationInfoOpenElementStackMixin<T extends TreeAdapterTypeMap> extends Mixin<OpenElementStack<T>> {
    private onItemPop: (item: T['parentNode']) => void;

    constructor(stack: OpenElementStack<T>, opts: LocationInfoOpenElementStackMixinOptions<T>) {
        super(stack);

        this.onItemPop = opts.onItemPop;
    }

    _getOverriddenMethods(mxn: LocationInfoOpenElementStackMixin<T>, orig: OpenElementStack<T>) {
        return {
            pop(this: OpenElementStack<T>) {
                mxn.onItemPop(this.current);
                orig.pop.call(this);
            },

            popAllUpToHtmlElement(this: OpenElementStack<T>) {
                for (let i = this.stackTop; i > 0; i--) {
                    mxn.onItemPop(this.items[i]);
                }

                orig.popAllUpToHtmlElement.call(this);
            },

            remove(this: OpenElementStack<T>, element: T['element']) {
                mxn.onItemPop(this.current);
                orig.remove.call(this, element);
            },
        };
    }
}
