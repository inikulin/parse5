import { Mixin, install as installMixin } from '../../utils/Mixin.js';
import { Tokenizer, Location, START_TAG_TOKEN, EOF_TOKEN, CharacterToken, State, MODE } from '../../tokenizer/index.js';
import { PositionTrackingPreprocessorMixin } from '../position-tracking/preprocessor-mixin.js';

export class LocationInfoTokenizerMixin extends Mixin<Tokenizer> {
    public posTracker: PositionTrackingPreprocessorMixin;
    protected _tokenizer: Tokenizer;
    protected _currentAttrLocation: Location | null;
    protected _ctLoc: Location | null;

    public constructor(tokenizer: Tokenizer) {
        super(tokenizer);

        this._tokenizer = tokenizer;
        this.posTracker = installMixin(tokenizer.preprocessor, PositionTrackingPreprocessorMixin);
        this._currentAttrLocation = null;
        this._ctLoc = null;
    }

    protected _getCurrentLocation(): Location {
        return {
            startLine: this.posTracker.line,
            startCol: this.posTracker.col,
            startOffset: this.posTracker.offset,
            endLine: -1,
            endCol: -1,
            endOffset: -1,
        };
    }

    protected _attachCurrentAttrLocationInfo(): void {
        if (!this._currentAttrLocation) {
            return;
        }

        this._currentAttrLocation.endLine = this.posTracker.line;
        this._currentAttrLocation.endCol = this.posTracker.col;
        this._currentAttrLocation.endOffset = this.posTracker.offset;

        const currentToken = this._tokenizer.currentToken;
        const currentAttr = this._tokenizer.currentAttr;

        if (currentAttr && currentToken?.type === START_TAG_TOKEN && currentToken.location) {
            if (!currentToken.location.attrs) {
                currentToken.location.attrs = {
                    [currentAttr.name]: this._currentAttrLocation,
                };
            } else {
                currentToken.location.attrs[currentAttr.name] = this._currentAttrLocation;
            }
        }
    }

    protected _getOverriddenMethods(orig: Partial<Tokenizer>) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mxn = this;
        const methods: Partial<Tokenizer> = {
            createStartTagToken(): void {
                orig.createStartTagToken?.call(this);
                if (this.currentToken && mxn._ctLoc) {
                    this.currentToken.location = mxn._ctLoc;
                }
            },

            createEndTagToken(): void {
                orig.createEndTagToken?.call(this);
                if (this.currentToken && mxn._ctLoc) {
                    this.currentToken.location = mxn._ctLoc;
                }
            },

            createCommentToken(): void {
                orig.createCommentToken?.call(this);
                if (this.currentToken && mxn._ctLoc) {
                    this.currentToken.location = mxn._ctLoc;
                }
            },

            createDoctypeToken(initialName: string | null): void {
                orig.createDoctypeToken?.call(this, initialName);
                if (this.currentToken && mxn._ctLoc) {
                    this.currentToken.location = mxn._ctLoc;
                }
            },

            createCharacterToken(type: CharacterToken['type'], ch: string): void {
                orig.createCharacterToken?.call(this, type, ch);
                if (this.currentCharacterToken && mxn._ctLoc) {
                    this.currentCharacterToken.location = mxn._ctLoc;
                }
            },

            createEOFToken(): void {
                orig.createEOFToken?.call(this);
                if (this.currentToken) {
                    this.currentToken.location = mxn._getCurrentLocation();
                }
            },

            createAttr(attrNameFirstCh: string): void {
                orig.createAttr?.call(this, attrNameFirstCh);
                mxn._currentAttrLocation = mxn._getCurrentLocation();
            },

            leaveAttrName(toState: State): void {
                orig.leaveAttrName?.call(this, toState);
                mxn._attachCurrentAttrLocationInfo();
            },

            leaveAttrValue(toState: State): void {
                orig.leaveAttrValue?.call(this, toState);
                mxn._attachCurrentAttrLocationInfo();
            },

            emitCurrentToken(): void {
                const ctLoc = this.currentToken?.location;

                if (ctLoc) {
                    //NOTE: if we have pending character token make it's end location equal to the
                    //current token's start location.
                    if (this.currentCharacterToken?.location) {
                        this.currentCharacterToken.location.endLine = ctLoc.startLine;
                        this.currentCharacterToken.location.endCol = ctLoc.startCol;
                        this.currentCharacterToken.location.endOffset = ctLoc.startOffset;
                    }

                    if (this.currentToken?.type === EOF_TOKEN) {
                        ctLoc.endLine = ctLoc.startLine;
                        ctLoc.endCol = ctLoc.startCol;
                        ctLoc.endOffset = ctLoc.startOffset;
                    } else {
                        ctLoc.endLine = mxn.posTracker.line;
                        ctLoc.endCol = mxn.posTracker.col + 1;
                        ctLoc.endOffset = mxn.posTracker.offset + 1;
                    }
                }

                orig.emitCurrentToken?.call(this);
            },

            emitCurrentCharacterToken(): void {
                const ctLoc = this.currentCharacterToken?.location;

                //NOTE: if we have character token and it's location wasn't set in the emitCurrentToken(),
                //then set it's location at the current preprocessor position.
                //We don't need to increment preprocessor position, since character token
                //emission is always forced by the start of the next character token here.
                //So, we already have advanced position.
                if (ctLoc && ctLoc.endOffset === -1) {
                    ctLoc.endLine = mxn.posTracker.line;
                    ctLoc.endCol = mxn.posTracker.col;
                    ctLoc.endOffset = mxn.posTracker.offset;
                }

                orig.emitCurrentCharacterToken?.call(this);
            },
        };

        //NOTE: patch initial states for each mode to obtain token start position
        Object.keys(MODE).forEach((modeName) => {
            const state = MODE[modeName as keyof typeof MODE];

            methods[state] = function (cp) {
                mxn._ctLoc = mxn._getCurrentLocation();
                orig[state]?.call(this, cp);
            };
        });

        return methods;
    }
}
