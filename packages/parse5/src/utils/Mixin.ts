export abstract class Mixin<T> {
    protected abstract _getOverriddenMethods(originalMethods: Partial<T>): Partial<T>;

    public constructor(host: T) {
        const originalMethods: Partial<T> = {};
        const overriddenMethods = this._getOverriddenMethods(originalMethods);

        for (const key in overriddenMethods) {
            if (Object.prototype.hasOwnProperty.call(overriddenMethods, key)) {
                const override = overriddenMethods[key];
                const hostMethod = host[key];
                if (override !== undefined) {
                    originalMethods[key] = hostMethod;
                    // TODO (43081j): no clue why i need this nasty cast,
                    // typescript refuses to drop the `undefined` from the type
                    host[key] = override as NonNullable<T[typeof key]>;
                }
            }
        }
    }
}

export function install<THost, TOpts, TMixin extends object>(
    host: THost,
    Ctor: { new (host: THost, opts?: TOpts): TMixin },
    opts?: TOpts
): TMixin {
    const mutableHost = host as THost & { __mixins?: Array<TMixin> };

    if (!mutableHost.__mixins) {
        mutableHost.__mixins = [];
    }

    for (let i = 0; i < mutableHost.__mixins.length; i++) {
        const cached = mutableHost.__mixins[i];
        if (cached?.constructor === Ctor) {
            return cached;
        }
    }

    const mixin = new Ctor(host, opts);

    mutableHost.__mixins.push(mixin);

    return mixin;
}
