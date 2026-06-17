/**
 * core.dom — DOM utilities (predicates, boundary-point navigation, tree surgery,
 * ancestor ops, offset-path conversion).
 * Ported 1:1 from src/js/core/dom.js (jQuery removed: all idioms replaced with native DOM).
 */
import func from './func';
import lists from './lists';
import env from './env';

/**
 * A boundary point: a node plus an offset within it.
 */
export interface BoundaryPoint {
  node: Node;
  offset: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pred = (node: any) => boolean;

const NBSP_CHAR = String.fromCharCode(160);
const ZERO_WIDTH_NBSP_CHAR = '﻿';

/**
 * @method isEditable
 *
 * returns whether node is `note-editable` or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function isEditable(node: Node | null | undefined): boolean {
  return !!(node && (node as Element).classList && (node as Element).classList.contains('note-editable'));
}

/**
 * @method isControlSizing
 *
 * returns whether node is `note-control-sizing` or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function isControlSizing(node: Node | null | undefined): boolean {
  return !!(node && (node as Element).classList && (node as Element).classList.contains('note-control-sizing'));
}

/**
 * @method makePredByNodeName
 *
 * returns predicate which judge whether nodeName is same
 *
 * @param {String} nodeName
 * @return {Function}
 */
function makePredByNodeName(nodeName: string): (node: Node | null | undefined) => boolean {
  nodeName = nodeName.toUpperCase();
  return function (node: Node | null | undefined): boolean {
    return !!(node && node.nodeName.toUpperCase() === nodeName);
  };
}

/**
 * @method isText
 *
 *
 *
 * @param {Node} node
 * @return {Boolean} true if node's type is text(3)
 */
function isText(node: Node | null | undefined): boolean {
  return !!(node && node.nodeType === 3);
}

/**
 * @method isElement
 *
 *
 *
 * @param {Node} node
 * @return {Boolean} true if node's type is element(1)
 */
function isElement(node: Node | null | undefined): boolean {
  return !!(node && node.nodeType === 1);
}

/**
 * ex) br, col, embed, hr, img, input, ...
 * @see http://www.w3.org/html/wg/drafts/html/master/syntax.html#void-elements
 */
function isVoid(node: Node | null | undefined): boolean {
  return !!(node && /^BR|^IMG|^HR|^IFRAME|^BUTTON|^INPUT|^AUDIO|^VIDEO|^EMBED/.test(node.nodeName.toUpperCase()));
}

function isPara(node: Node | null | undefined): boolean {
  if (isEditable(node)) {
    return false;
  }

  // Chrome(v31.0), FF(v25.0.1) use DIV for paragraph
  return !!(node && /^DIV|^P|^LI|^H[1-7]/.test(node.nodeName.toUpperCase()));
}

function isHeading(node: Node | null | undefined): boolean {
  return !!(node && /^H[1-7]/.test(node.nodeName.toUpperCase()));
}

const isPre = makePredByNodeName('PRE');

const isLi = makePredByNodeName('LI');

function isPurePara(node: Node | null | undefined): boolean {
  return isPara(node) && !isLi(node);
}

const isTable = makePredByNodeName('TABLE');

const isData = makePredByNodeName('DATA');

function isInline(node: Node | null | undefined): boolean {
  return !isBodyContainer(node) &&
         !isList(node) &&
         !isHr(node) &&
         !isPara(node) &&
         !isTable(node) &&
         !isBlockquote(node) &&
         !isData(node);
}

function isList(node: Node | null | undefined): boolean {
  return !!(node && /^UL|^OL/.test(node.nodeName.toUpperCase()));
}

const isHr = makePredByNodeName('HR');

function isCell(node: Node | null | undefined): boolean {
  return !!(node && /^TD|^TH/.test(node.nodeName.toUpperCase()));
}

const isBlockquote = makePredByNodeName('BLOCKQUOTE');

function isBodyContainer(node: Node | null | undefined): boolean {
  return isCell(node) || isBlockquote(node) || isEditable(node);
}

const isAnchor = makePredByNodeName('A');

function isParaInline(node: Node | null | undefined): boolean {
  return isInline(node) && !!ancestor(node as Node, isPara);
}

function isBodyInline(node: Node | null | undefined): boolean {
  return isInline(node) && !ancestor(node as Node, isPara);
}

const isBody = makePredByNodeName('BODY');

/**
 * returns whether nodeB is closest sibling of nodeA
 *
 * @param {Node} nodeA
 * @param {Node} nodeB
 * @return {Boolean}
 */
function isClosestSibling(nodeA: Node, nodeB: Node): boolean {
  return nodeA.nextSibling === nodeB ||
         nodeA.previousSibling === nodeB;
}

/**
 * returns array of closest siblings with node
 *
 * @param {Node} node
 * @param {function} [pred] - predicate function
 * @return {Node[]}
 */
function withClosestSiblings(node: Node, pred?: Pred): Node[] {
  pred = pred || func.ok;

  const siblings: Node[] = [];
  if (node.previousSibling && pred(node.previousSibling)) {
    siblings.push(node.previousSibling);
  }
  siblings.push(node);
  if (node.nextSibling && pred(node.nextSibling)) {
    siblings.push(node.nextSibling);
  }
  return siblings;
}

/**
 * blank HTML for cursor position
 * - [workaround] old IE only works with &nbsp;
 * - [workaround] IE11 and other browser works with bogus br
 */
const blankHTML = env.isMSIE && (env.browserVersion as number) < 11 ? '&nbsp;' : '<br>';

/**
 * @method nodeLength
 *
 * returns #text's text size or element's childNodes size
 *
 * @param {Node} node
 */
function nodeLength(node: Node | null | undefined): number {
  if (isText(node)) {
    return (node as Node).nodeValue!.length;
  }

  if (node) {
    return node.childNodes.length;
  }

  return 0;
}

/**
 * returns whether deepest child node is empty or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function deepestChildIsEmpty(node: Node): boolean {
  do {
    if ((node as Element).firstElementChild === null || (node as Element).firstElementChild!.innerHTML === '') break;
  } while ((node = (node as Element).firstElementChild as Node));

  return isEmpty(node);
}

/**
 * returns whether node is empty or not.
 *
 * @param {Node} node
 * @return {Boolean}
 */
function isEmpty(node: Node): boolean {
  const len = nodeLength(node);

  if (len === 0) {
    return true;
  } else if (!isText(node) && len === 1 && (node as Element).innerHTML === blankHTML) {
    // ex) <p><br></p>, <span><br></span>
    return true;
  } else if (lists.all(lists.from(node.childNodes), isText) && (node as Element).innerHTML === '') {
    // ex) <p></p>, <span></span>
    return true;
  }

  return false;
}

/**
 * padding blankHTML if node is empty (for cursor position)
 */
function paddingBlankHTML(node: Node): void {
  if (!isVoid(node) && !nodeLength(node)) {
    (node as Element).innerHTML = blankHTML;
  }
}

/**
 * find nearest ancestor predicate hit
 *
 * @param {Node} node
 * @param {Function} pred - predicate function
 */
function ancestor(node: Node | null, pred: Pred): Node | null {
  while (node) {
    if (pred(node)) { return node; }
    if (isEditable(node)) { break; }

    node = node.parentNode;
  }
  return null;
}

/**
 * find nearest ancestor only single child blood line and predicate hit
 *
 * @param {Node} node
 * @param {Function} pred - predicate function
 */
function singleChildAncestor(node: Node, pred: Pred): Node | null {
  let cur: Node | null = node.parentNode;

  while (cur) {
    if (nodeLength(cur) !== 1) { break; }
    if (pred(cur)) { return cur; }
    if (isEditable(cur)) { break; }

    cur = cur.parentNode;
  }
  return null;
}

/**
 * returns new array of ancestor nodes (until predicate hit).
 *
 * @param {Node} node
 * @param {Function} [optional] pred - predicate function
 */
function listAncestor(node: Node, pred?: Pred): Node[] {
  pred = pred || func.fail;

  const ancestors: Node[] = [];
  ancestor(node, function (el) {
    if (!isEditable(el)) {
      ancestors.push(el);
    }

    return pred!(el);
  });
  return ancestors;
}

/**
 * find farthest ancestor predicate hit
 */
function lastAncestor(node: Node, pred: Pred): Node {
  const ancestors = listAncestor(node);
  return lists.last(ancestors.filter(pred));
}

/**
 * returns common ancestor node between two nodes.
 *
 * @param {Node} nodeA
 * @param {Node} nodeB
 */
function commonAncestor(nodeA: Node, nodeB: Node): Node | null {
  const ancestors = listAncestor(nodeA);
  for (let n: Node | null = nodeB; n; n = n.parentNode) {
    if (ancestors.indexOf(n) > -1) return n;
  }
  return null; // difference document area
}

/**
 * listing all previous siblings (until predicate hit).
 *
 * @param {Node} node
 * @param {Function} [optional] pred - predicate function
 */
function listPrev(node: Node | null, pred?: Pred): Node[] {
  pred = pred || func.fail;

  const nodes: Node[] = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.previousSibling;
  }
  return nodes;
}

/**
 * listing next siblings (until predicate hit).
 *
 * @param {Node} node
 * @param {Function} [pred] - predicate function
 */
function listNext(node: Node | null, pred?: Pred): Node[] {
  pred = pred || func.fail;

  const nodes: Node[] = [];
  while (node) {
    if (pred(node)) { break; }
    nodes.push(node);
    node = node.nextSibling;
  }
  return nodes;
}

/**
 * listing descendant nodes
 *
 * @param {Node} node
 * @param {Function} [pred] - predicate function
 */
function listDescendant(node: Node, pred?: Pred): Node[] {
  const descendants: Node[] = [];
  pred = pred || func.ok;

  // start DFS(depth first search) with node
  (function fnWalk(current: Node) {
    if (node !== current && pred!(current)) {
      descendants.push(current);
    }
    for (let idx = 0, len = current.childNodes.length; idx < len; idx++) {
      fnWalk(current.childNodes[idx]);
    }
  })(node);

  return descendants;
}

/**
 * wrap node with new tag.
 *
 * @param {Node} node
 * @param {Node} tagName of wrapper
 * @return {Node} - wrapper
 */
function wrap(node: Node, wrapperName: string): Node {
  const parent = node.parentNode;
  const wrapper = create(wrapperName);

  parent!.insertBefore(wrapper, node);
  wrapper.appendChild(node);

  return wrapper;
}

/**
 * insert node after preceding
 *
 * @param {Node} node
 * @param {Node} preceding - predicate function
 */
function insertAfter(node: Node, preceding: Node): Node {
  const next = preceding.nextSibling;
  const parent = preceding.parentNode;
  if (next) {
    parent!.insertBefore(node, next);
  } else {
    parent!.appendChild(node);
  }
  return node;
}

/**
 * append elements.
 *
 * @param {Node} node
 * @param {Collection} aChild
 */
function appendChildNodes(node: Node, aChild: ArrayLike<Node>, isSkipPaddingBlankHTML?: boolean): Node {
  for (let idx = 0, len = aChild.length; idx < len; idx++) {
    const child = aChild[idx];
    // special case: appending a pure UL/OL to a LI element creates inaccessible LI element
    // e.g. press enter in last LI which has UL/OL-subelements
    // Therefore, if current node is LI element with no child nodes (text-node) and appending a list, add a br before
    if (!isSkipPaddingBlankHTML && isLi(node) && node.firstChild === null && isList(child)) {
      node.appendChild(create('br'));
    }

    node.appendChild(child);
  }
  return node;
}

/**
 * returns whether boundaryPoint is left edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isLeftEdgePoint(point: BoundaryPoint): boolean {
  return point.offset === 0;
}

/**
 * returns whether boundaryPoint is right edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isRightEdgePoint(point: BoundaryPoint): boolean {
  return point.offset === nodeLength(point.node);
}

/**
 * returns whether boundaryPoint is edge or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isEdgePoint(point: BoundaryPoint): boolean {
  return isLeftEdgePoint(point) || isRightEdgePoint(point);
}

/**
 * returns whether node is left edge of ancestor or not.
 *
 * @param {Node} node
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isLeftEdgeOf(node: Node | null, ancestor: Node): boolean {
  while (node && node !== ancestor) {
    if (position(node) !== 0) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * returns whether node is right edge of ancestor or not.
 *
 * @param {Node} node
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isRightEdgeOf(node: Node | null, ancestor: Node | null): boolean {
  if (!ancestor) {
    return false;
  }
  while (node && node !== ancestor) {
    if (position(node) !== nodeLength(node.parentNode) - 1) {
      return false;
    }
    node = node.parentNode;
  }

  return true;
}

/**
 * returns whether point is left edge of ancestor or not.
 * @param {BoundaryPoint} point
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isLeftEdgePointOf(point: BoundaryPoint, ancestor: Node): boolean {
  return isLeftEdgePoint(point) && isLeftEdgeOf(point.node, ancestor);
}

/**
 * returns whether point is right edge of ancestor or not.
 * @param {BoundaryPoint} point
 * @param {Node} ancestor
 * @return {Boolean}
 */
function isRightEdgePointOf(point: BoundaryPoint, ancestor: Node): boolean {
  return isRightEdgePoint(point) && isRightEdgeOf(point.node, ancestor);
}

/**
 * returns offset from parent.
 *
 * @param {Node} node
 */
function position(node: Node): number {
  let offset = 0;
  let cur: Node | null = node;
  while ((cur = cur.previousSibling)) {
    offset += 1;
  }
  return offset;
}

function hasChildren(node: Node | null | undefined): boolean {
  return !!(node && node.childNodes && node.childNodes.length);
}

/**
 * returns previous boundaryPoint
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function prevPoint(point: BoundaryPoint, isSkipInnerOffset?: boolean): BoundaryPoint | null {
  let node: Node;
  let offset: number;

  if (point.offset === 0) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode as Node;
    offset = position(point.node);
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset - 1];
    offset = nodeLength(node);
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? 0 : point.offset - 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/**
 * returns next boundaryPoint
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function nextPoint(point: BoundaryPoint, isSkipInnerOffset?: boolean): BoundaryPoint | null {
  let node: Node, offset: number;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    const nextTextNode = getNextTextNode(point.node);
    if (nextTextNode) {
      node = nextTextNode;
      offset = 0;
    } else {
      node = point.node.parentNode as Node;
      offset = position(point.node) + 1;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/**
 * Find next boundaryPoint for preorder / depth first traversal of the DOM
 * returns next boundaryPoint with empty node
 *
 * @param {BoundaryPoint} point
 * @param {Boolean} isSkipInnerOffset
 * @return {BoundaryPoint}
 */
function nextPointWithEmptyNode(point: BoundaryPoint, isSkipInnerOffset?: boolean): BoundaryPoint | null {
  let node: Node, offset = 0;

  if (nodeLength(point.node) === point.offset) {
    if (isEditable(point.node)) {
      return null;
    }

    node = point.node.parentNode as Node;
    offset = position(point.node) + 1;

    // if parent node is editable,  return current node's sibling node.
    if (isEditable(node)) {
      node = point.node.nextSibling as Node;
      offset = 0;
    }
  } else if (hasChildren(point.node)) {
    node = point.node.childNodes[point.offset];
    offset = 0;
  } else {
    node = point.node;
    offset = isSkipInnerOffset ? nodeLength(point.node) : point.offset + 1;
  }

  return {
    node: node,
    offset: offset,
  };
}

/*
* returns the next Text node index or 0 if not found.
*/
function getNextTextNode(actual: Node): Node | undefined {
  if (!actual.nextSibling) return undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((actual as any).parent !== (actual.nextSibling as any).parent) return undefined;

  if (isText(actual.nextSibling)) return actual.nextSibling;
  else return getNextTextNode(actual.nextSibling);
}

/**
 * returns whether pointA and pointB is same or not.
 *
 * @param {BoundaryPoint} pointA
 * @param {BoundaryPoint} pointB
 * @return {Boolean}
 */
function isSamePoint(pointA: BoundaryPoint, pointB: BoundaryPoint): boolean {
  return pointA.node === pointB.node && pointA.offset === pointB.offset;
}

/**
 * returns whether point is visible (can set cursor) or not.
 *
 * @param {BoundaryPoint} point
 * @return {Boolean}
 */
function isVisiblePoint(point: BoundaryPoint): boolean {
  if (isText(point.node) || !hasChildren(point.node) || isEmpty(point.node)) {
    return true;
  }

  const leftNode = point.node.childNodes[point.offset - 1];
  const rightNode = point.node.childNodes[point.offset];
  if ((!leftNode || isVoid(leftNode)) && (!rightNode || isVoid(rightNode)) || isTable(rightNode)) {
    return true;
  }

  return false;
}

/**
 * @method prevPointUtil
 *
 * @param {BoundaryPoint} point
 * @param {Function} pred
 * @return {BoundaryPoint}
 */
function prevPointUntil(point: BoundaryPoint | null, pred: (point: BoundaryPoint) => boolean): BoundaryPoint | null {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = prevPoint(point);
  }

  return null;
}

/**
 * @method nextPointUntil
 *
 * @param {BoundaryPoint} point
 * @param {Function} pred
 * @return {BoundaryPoint}
 */
function nextPointUntil(point: BoundaryPoint | null, pred: (point: BoundaryPoint) => boolean): BoundaryPoint | null {
  while (point) {
    if (pred(point)) {
      return point;
    }

    point = nextPoint(point);
  }

  return null;
}

/**
 * returns whether point has character or not.
 *
 * @param {Point} point
 * @return {Boolean}
 */
function isCharPoint(point: BoundaryPoint): boolean {
  if (!isText(point.node)) {
    return false;
  }

  const ch = point.node.nodeValue!.charAt(point.offset - 1);
  return !!ch && (ch !== ' ' && ch !== NBSP_CHAR);
}

/**
 * returns whether point has space or not.
 *
 * @param {Point} point
 * @return {Boolean}
 */
function isSpacePoint(point: BoundaryPoint): boolean {
  if (!isText(point.node)) {
    return false;
  }

  const ch = point.node.nodeValue!.charAt(point.offset - 1);
  return ch === ' ' || ch === NBSP_CHAR;
}

/**
 * @method walkPoint - preorder / depth first traversal of the DOM
 *
 * @param {BoundaryPoint} startPoint
 * @param {BoundaryPoint} endPoint
 * @param {Function} handler
 * @param {Boolean} isSkipInnerOffset
 */
function walkPoint(
  startPoint: BoundaryPoint,
  endPoint: BoundaryPoint,
  handler: (point: BoundaryPoint) => void,
  isSkipInnerOffset?: boolean,
): void {
  let point: BoundaryPoint | null = startPoint;

  while (point && point.node) {
    handler(point);

    if (isSamePoint(point, endPoint)) {
      break;
    }

    const isSkipOffset = !!isSkipInnerOffset &&
                       startPoint.node !== point.node &&
                       endPoint.node !== point.node;
    point = nextPointWithEmptyNode(point, isSkipOffset);
  }
}

/**
 * @method makeOffsetPath
 *
 * return offsetPath(array of offset) from ancestor
 *
 * @param {Node} ancestor - ancestor node
 * @param {Node} node
 */
function makeOffsetPath(ancestor: Node, node: Node): number[] {
  const ancestors = listAncestor(node, func.eq(ancestor));
  return ancestors.map(position).reverse();
}

/**
 * @method fromOffsetPath
 *
 * return element from offsetPath(array of offset)
 *
 * @param {Node} ancestor - ancestor node
 * @param {array} offsets - offsetPath
 */
function fromOffsetPath(ancestor: Node, offsets: number[]): Node {
  let current = ancestor;
  for (let i = 0, len = offsets.length; i < len; i++) {
    if (current.childNodes.length <= offsets[i]) {
      current = current.childNodes[current.childNodes.length - 1];
    } else {
      current = current.childNodes[offsets[i]];
    }
  }
  return current;
}

interface SplitOptions {
  isSkipPaddingBlankHTML?: boolean;
  isNotSplitEdgePoint?: boolean;
  isDiscardEmptySplits?: boolean;
}

/**
 * @method splitNode
 *
 * split element or #text
 *
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @param {Boolean} [options.isDiscardEmptySplits] - default: false
 * @return {Node} right node of boundaryPoint
 */
function splitNode(point: BoundaryPoint, options?: SplitOptions): Node | null {
  let isSkipPaddingBlankHTML = options && options.isSkipPaddingBlankHTML;
  const isNotSplitEdgePoint = options && options.isNotSplitEdgePoint;
  const isDiscardEmptySplits = options && options.isDiscardEmptySplits;

  if (isDiscardEmptySplits) {
    isSkipPaddingBlankHTML = true;
  }

  // edge case
  if (isEdgePoint(point) && (isText(point.node) || isNotSplitEdgePoint)) {
    if (isLeftEdgePoint(point)) {
      return point.node;
    } else if (isRightEdgePoint(point)) {
      return point.node.nextSibling;
    }
  }

  // split #text
  if (isText(point.node)) {
    return (point.node as Text).splitText(point.offset);
  } else {
    const childNode = point.node.childNodes[point.offset];
    const childNodes = listNext(childNode);

    const clone = insertAfter(point.node.cloneNode(false), point.node);
    appendChildNodes(clone, childNodes);

    if (!isSkipPaddingBlankHTML) {
      paddingBlankHTML(point.node);
      paddingBlankHTML(clone);
    }

    if (isDiscardEmptySplits) {
      if (isEmpty(point.node)) {
        remove(point.node);
      }
      if (isEmpty(clone)) {
        remove(clone);
        return point.node.nextSibling;
      }
    }

    return clone;
  }
}

/**
 * @method splitTree
 *
 * split tree by point
 *
 * @param {Node} root - split root
 * @param {BoundaryPoint} point
 * @param {Object} [options]
 * @param {Boolean} [options.isSkipPaddingBlankHTML] - default: false
 * @param {Boolean} [options.isNotSplitEdgePoint] - default: false
 * @return {Node} right node of boundaryPoint
 */
function splitTree(root: Node, point: BoundaryPoint, options?: SplitOptions): Node | null {
  // ex) [#text, <span>, <p>]
  let ancestors = listAncestor(point.node, func.eq(root));

  if (!ancestors.length) {
    return null;
  } else if (ancestors.length === 1) {
    return splitNode(point, options);
  }
  // Filter elements with sibling elements
  if (ancestors.length > 2) {
    const domList = ancestors.slice(0, ancestors.length - 1);
    const ifHasNextSibling = domList.find(item => item.nextSibling);
    if (ifHasNextSibling && point.offset != 0 && isRightEdgePoint(point)) {
      const nestSibling = ifHasNextSibling.nextSibling as Node;
      let textNode: Node;
      if (nestSibling.nodeType == 1) {
        textNode = nestSibling.childNodes[0];
        ancestors = listAncestor(textNode, func.eq(root));
        point = {
          node: textNode,
          offset: 0,
        };
      }
      else if (nestSibling.nodeType == 3 && !(nestSibling as Text).data.match(/[\n\r]/g)) {
        textNode = nestSibling;
        ancestors = listAncestor(textNode, func.eq(root));
        point = {
          node: textNode,
          offset: 0,
        };
      }
    }
  }
  return (ancestors as Array<Node | null>).reduce(function (node: Node | null, parent: Node | null) {
    if (node === point.node) {
      node = splitNode(point, options);
    }

    return splitNode({
      node: parent as Node,
      offset: node ? position(node) : nodeLength(parent),
    }, options);
  });
}

interface SplitPointResult {
  rightNode: Node | null;
  container: Node;
}

/**
 * split point
 *
 * @param {Point} point
 * @param {Boolean} isInline
 * @return {Object}
 */
function splitPoint(point: BoundaryPoint, isInline: boolean): SplitPointResult {
  // find splitRoot, container
  //  - inline: splitRoot is a child of paragraph
  //  - block: splitRoot is a child of bodyContainer
  const pred = isInline ? isPara : isBodyContainer;
  const ancestors = listAncestor(point.node, pred);
  const topAncestor = lists.last(ancestors) || point.node;

  let splitRoot: Node | undefined, container: Node;
  if (pred(topAncestor)) {
    splitRoot = ancestors[ancestors.length - 2];
    container = topAncestor;
  } else {
    splitRoot = topAncestor;
    container = splitRoot.parentNode as Node;
  }

  // if splitRoot is exists, split with splitTree
  let pivot = splitRoot && splitTree(splitRoot, point, {
    isSkipPaddingBlankHTML: isInline,
    isNotSplitEdgePoint: isInline,
  });

  // if container is point.node, find pivot with point.offset
  if (!pivot && container === point.node) {
    pivot = point.node.childNodes[point.offset];
  }

  return {
    rightNode: pivot || null,
    container: container,
  };
}

function create(nodeName: string): HTMLElement {
  return document.createElement(nodeName);
}

function createText(text: string): Text {
  return document.createTextNode(text);
}

/**
 * @method remove
 *
 * remove node, (isRemoveChild: remove child or not)
 *
 * @param {Node} node
 * @param {Boolean} isRemoveChild
 */
function remove(node: Node | null | undefined, isRemoveChild?: boolean): void {
  if (!node || !node.parentNode) { return; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((node as any).removeNode) { return (node as any).removeNode(isRemoveChild); }

  const parent = node.parentNode;
  if (!isRemoveChild) {
    const nodes: Node[] = [];
    for (let i = 0, len = node.childNodes.length; i < len; i++) {
      nodes.push(node.childNodes[i]);
    }

    for (let i = 0, len = nodes.length; i < len; i++) {
      parent.insertBefore(nodes[i], node);
    }
  }

  parent.removeChild(node);
}

/**
 * @method removeWhile
 *
 * @param {Node} node
 * @param {Function} pred
 */
function removeWhile(node: Node | null, pred: Pred): void {
  while (node) {
    if (isEditable(node) || !pred(node)) {
      break;
    }

    const parent = node.parentNode;
    remove(node);
    node = parent;
  }
}

/**
 * @method replace
 *
 * replace node with provided nodeName
 *
 * @param {Node} node
 * @param {String} nodeName
 * @return {Node} - new node
 */
function replace(node: Node, nodeName: string): Node {
  if (node.nodeName.toUpperCase() === nodeName.toUpperCase()) {
    return node;
  }

  const newNode = create(nodeName);

  if ((node as HTMLElement).style.cssText) {
    newNode.style.cssText = (node as HTMLElement).style.cssText;
  }

  appendChildNodes(newNode, lists.from(node.childNodes));
  insertAfter(newNode, node);
  remove(node);

  return newNode;
}

const isTextarea = makePredByNodeName('TEXTAREA');

/**
 * @param {Element} node
 * @param {Boolean} [stripLinebreaks] - default: false
 */
function value(node: Element, stripLinebreaks?: boolean): string {
  const val = isTextarea(node) ? (node as HTMLTextAreaElement).value : node.innerHTML;
  if (stripLinebreaks) {
    return val.replace(/[\n\r]/g, '');
  }
  return val;
}

/**
 * @method html
 *
 * get the HTML contents of node
 *
 * @param {Element} node
 * @param {Boolean} [isNewlineOnBlock]
 */
function html(node: Element, isNewlineOnBlock?: boolean): string {
  let markup = value(node);

  if (isNewlineOnBlock) {
    const regexTag = /<(\/?)(\b(?!!)[^>\s]*)(.*?)(\s*\/?>)/g;
    markup = markup.replace(regexTag, function (match: string, endSlash: string, name: string) {
      name = name.toUpperCase();
      const isEndOfInlineContainer = /^DIV|^TD|^TH|^P|^LI|^H[1-7]/.test(name) &&
                                   !!endSlash;
      const isBlockNode = /^BLOCKQUOTE|^TABLE|^TBODY|^TR|^HR|^UL|^OL/.test(name);

      return match + ((isEndOfInlineContainer || isBlockNode) ? '\n' : '');
    });
    markup = markup.trim();
  }

  return markup;
}

interface Position {
  left: number;
  top: number;
}

function posFromPlaceholder(placeholder: HTMLElement): Position {
  const rect = placeholder.getBoundingClientRect();
  const pos = {
    left: rect.left + window.scrollX,
    top: rect.top + window.scrollY,
  };
  const style = getComputedStyle(placeholder);
  // outerHeight(true): offsetHeight includes border + padding; add margin for true outer height
  const marginTop = parseFloat(style.marginTop) || 0;
  const marginBottom = parseFloat(style.marginBottom) || 0;
  const height = placeholder.offsetHeight + marginTop + marginBottom; // include margin

  return {
    left: pos.left,
    top: pos.top + height,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function attachEvents(node: EventTarget, events: Record<string, EventListenerOrEventListenerObject>): void {
  Object.keys(events).forEach(function (key) {
    node.addEventListener(key, events[key]);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detachEvents(node: EventTarget, events: Record<string, EventListenerOrEventListenerObject>): void {
  Object.keys(events).forEach(function (key) {
    node.removeEventListener(key, events[key]);
  });
}

/**
 * @method isCustomStyleTag
 *
 * assert if a node contains a "note-styletag" class,
 * which implies that's a custom-made style tag node
 *
 * @param {Node} an HTML DOM node
 */
function isCustomStyleTag(node: Node | null | undefined): boolean {
  return !!(node && !isText(node) && lists.contains((node as Element).classList, 'note-styletag'));
}

const dom = {
  /** @property {String} NBSP_CHAR */
  NBSP_CHAR,
  /** @property {String} ZERO_WIDTH_NBSP_CHAR */
  ZERO_WIDTH_NBSP_CHAR,
  /** @property {String} blank */
  blank: blankHTML,
  /** @property {String} emptyPara */
  emptyPara: `<p>${blankHTML}</p>`,
  makePredByNodeName,
  isEditable,
  isControlSizing,
  isText,
  isElement,
  isVoid,
  isPara,
  isPurePara,
  isHeading,
  isInline,
  isBlock: func.not(isInline),
  isBodyInline,
  isBody,
  isParaInline,
  isPre,
  isList,
  isTable,
  isData,
  isCell,
  isBlockquote,
  isBodyContainer,
  isAnchor,
  isDiv: makePredByNodeName('DIV'),
  isLi,
  isBR: makePredByNodeName('BR'),
  isSpan: makePredByNodeName('SPAN'),
  isB: makePredByNodeName('B'),
  isU: makePredByNodeName('U'),
  isS: makePredByNodeName('S'),
  isI: makePredByNodeName('I'),
  isImg: makePredByNodeName('IMG'),
  isTextarea,
  deepestChildIsEmpty,
  isEmpty,
  isEmptyAnchor: func.and(isAnchor, isEmpty as Pred),
  isClosestSibling,
  withClosestSiblings,
  nodeLength,
  isLeftEdgePoint,
  isRightEdgePoint,
  isEdgePoint,
  isLeftEdgeOf,
  isRightEdgeOf,
  isLeftEdgePointOf,
  isRightEdgePointOf,
  prevPoint,
  nextPoint,
  nextPointWithEmptyNode,
  isSamePoint,
  isVisiblePoint,
  prevPointUntil,
  nextPointUntil,
  isCharPoint,
  isSpacePoint,
  walkPoint,
  ancestor,
  singleChildAncestor,
  listAncestor,
  lastAncestor,
  listNext,
  listPrev,
  listDescendant,
  commonAncestor,
  wrap,
  insertAfter,
  appendChildNodes,
  position,
  hasChildren,
  makeOffsetPath,
  fromOffsetPath,
  splitTree,
  splitPoint,
  create,
  createText,
  remove,
  removeWhile,
  replace,
  html,
  value,
  posFromPlaceholder,
  attachEvents,
  detachEvents,
  isCustomStyleTag,
};

export default dom;
