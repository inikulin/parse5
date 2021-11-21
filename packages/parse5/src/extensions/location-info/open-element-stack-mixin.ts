import { Mixin } from '../../utils/Mixin.js';
import { OpenElementStack } from '../../parser/open-element-stack.js';
import { TreeAdapterTypeMap } from '../../treeAdapter.js';

export interface LocationInfoOptions<T extends TreeAdapterTypeMap> {
    onItemPop: (item: T['element']) => void;
}

export class LocationInfoOpenElementStackMixin<T extends TreeAdapterTypeMap> extends Mixin<OpenElementStack<T>> {
    protected _onItemPop?: (item: T['element']) => void;

    public constructor(stack: OpenElementStack<T>, opts?: LocationInfoOptions<T>) {
        super(stack);

        this._onItemPop = opts?.onItemPop;
    }

    protected _getOverriddenMethods(orig: Partial<OpenElementStack<T>>): Partial<OpenElementStack<T>> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        return {
            pop(this: OpenElementStack<T>): void {
                mxn._onItemPop?.(this.current);
                orig.pop?.call(this);
            },

            popAllUpToHtmlElement(this: OpenElementStack<T>): void {
                for (let i = this.stackTop; i > 0; i--) {
                    const item = this.items[i];
                    if (item) {
                        mxn._onItemPop?.(item);
                    }
                }

                orig.popAllUpToHtmlElement?.call(this);
            },

            remove(this: OpenElementStack<T>, element: T['element']): void {
                mxn._onItemPop?.(this.current);
                orig.remove?.call(this, element);
            },
        };
    }
}
