var OpenElementsStack = exports.OpenElementsStack = function (document) {
    this.stackTop = -1;
    this.stack = [];
    this.currentNode = document;
};

OpenElementsStack.prototype.pop = function () {
    this.currentNode = this.stack[--this.stackTop];
};

OpenElementsStack.popUpToHtmlElement = function () {
    //NOTE: here we assume that root 'html' element is always first in the open elements stack, so
    //we perform this fast stack clean up.
    this.stackTop = 0;
};

OpenElementsStack.prototype.push = function (element) {
    this.stack[++this.stackTop] = element;
    this.currentNode = element;
};

OpenElementsStack.prototype.peekProperlyInsertedBodyElement = function () {
    var element = this.stack[1];
    return element && this.stack[1].tagName === 'body' ? element : null;
};
