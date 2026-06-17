/**
 * core.range — WrappedRange (boundary-point pair) and range factory.
 * Ported 1:1 from src/js/core/range.js (jQuery removed: all idioms replaced with native DOM).
 *
 * The legacy IE TextRange branch is preserved but isolated behind env.isW3CRangeSupport
 * (the engine still references these paths).
 */
import env from './env';
import func from './func';
import lists from './lists';
import dom from './dom';
import type { BoundaryPoint } from './dom';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pred = (node: any) => boolean;

// The IE TextRange API is not part of the standard DOM lib typings. We model the
// pieces used by the legacy code as `any` to keep the ported paths intact.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TextRange = any;

/**
 * legacy IE point: a container node plus an offset within it.
 */
interface IEPoint {
  cont: Node;
  offset: number;
}

/**
 * bookmark point: an offset-path from an ancestor plus an offset.
 */
interface BookmarkPoint {
  path: number[];
  offset: number;
}

interface Bookmark {
  s: BookmarkPoint;
  e: BookmarkPoint;
}

interface BoundaryPoints {
  sc: Node;
  so: number;
  ec: Node;
  eo: number;
}

interface NodesOptions {
  includeAncestor?: boolean;
  fullyContains?: boolean;
}

/**
 * return boundaryPoint from TextRange, inspired by Andy Na's HuskyRange.js
 *
 * @param {TextRange} textRange
 * @param {Boolean} isStart
 * @return {BoundaryPoint}
 *
 * @see http://msdn.microsoft.com/en-us/library/ie/ms535872(v=vs.85).aspx
 */
function textRangeToPoint(textRange: TextRange, isStart: boolean): IEPoint {
  let container = textRange.parentElement();
  let offset;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tester = (document.body as any).createTextRange();
  let prevContainer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const childNodes = lists.from<any>(container.childNodes);
  for (offset = 0; offset < childNodes.length; offset++) {
    if (dom.isText(childNodes[offset])) {
      continue;
    }
    tester.moveToElementText(childNodes[offset]);
    if (tester.compareEndPoints('StartToStart', textRange) >= 0) {
      break;
    }
    prevContainer = childNodes[offset];
  }

  if (offset !== 0 && dom.isText(childNodes[offset - 1])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const textRangeStart = (document.body as any).createTextRange();
    let curTextNode = null;
    textRangeStart.moveToElementText(prevContainer || container);
    textRangeStart.collapse(!prevContainer);
    curTextNode = prevContainer ? prevContainer.nextSibling : container.firstChild;

    const pointTester = textRange.duplicate();
    pointTester.setEndPoint('StartToStart', textRangeStart);
    let textCount = pointTester.text.replace(/[\r\n]/g, '').length;

    while (textCount > curTextNode.nodeValue.length && curTextNode.nextSibling) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    // [workaround] enforce IE to re-reference curTextNode, hack
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const dummy = curTextNode.nodeValue; // eslint-disable-line

    if (isStart && curTextNode.nextSibling && dom.isText(curTextNode.nextSibling) &&
      textCount === curTextNode.nodeValue.length) {
      textCount -= curTextNode.nodeValue.length;
      curTextNode = curTextNode.nextSibling;
    }

    container = curTextNode;
    offset = textCount;
  }

  return {
    cont: container,
    offset: offset,
  };
}

/**
 * return TextRange from boundary point (inspired by google closure-library)
 * @param {BoundaryPoint} point
 * @return {TextRange}
 */
function pointToTextRange(point: BoundaryPoint): TextRange {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRangeInfo = function(container: any, offset: number): { node: any; collapseToStart: boolean; offset: number } {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any, isCollapseToStart: boolean;

    if (dom.isText(container)) {
      const prevTextNodes = dom.listPrev(container, func.not(dom.isText));
      const prevContainer = lists.last(prevTextNodes).previousSibling;
      node = prevContainer || container.parentNode;
      offset += lists.sum(lists.tail(prevTextNodes), dom.nodeLength);
      isCollapseToStart = !prevContainer;
    } else {
      node = container.childNodes[offset] || container;
      if (dom.isText(node)) {
        return textRangeInfo(node, 0);
      }

      offset = 0;
      isCollapseToStart = false;
    }

    return {
      node: node,
      collapseToStart: isCollapseToStart,
      offset: offset,
    };
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textRange = (document.body as any).createTextRange();
  const info = textRangeInfo(point.node, point.offset);

  textRange.moveToElementText(info.node);
  textRange.collapse(info.collapseToStart);
  textRange.moveStart('character', info.offset);
  return textRange;
}

/**
   * Wrapped Range
   *
   * @constructor
   * @param {Node} sc - start container
   * @param {Number} so - start offset
   * @param {Node} ec - end container
   * @param {Number} eo - end offset
   */
class WrappedRange {
  sc: Node;
  so: number;
  ec: Node;
  eo: number;

  isOnEditable: () => boolean;
  isOnList: () => boolean;
  isOnAnchor: () => boolean;
  isOnCell: () => boolean;
  isOnData: () => boolean;

  constructor(sc: Node, so: number, ec: Node, eo: number) {
    this.sc = sc;
    this.so = so;
    this.ec = ec;
    this.eo = eo;

    // isOnEditable: judge whether range is on editable or not
    this.isOnEditable = this.makeIsOn(dom.isEditable);
    // isOnList: judge whether range is on list node or not
    this.isOnList = this.makeIsOn(dom.isList);
    // isOnAnchor: judge whether range is on anchor node or not
    this.isOnAnchor = this.makeIsOn(dom.isAnchor);
    // isOnCell: judge whether range is on cell node or not
    this.isOnCell = this.makeIsOn(dom.isCell);
    // isOnData: judge whether range is on data node or not
    this.isOnData = this.makeIsOn(dom.isData);
  }

  // nativeRange: get nativeRange from sc, so, ec, eo
  nativeRange(): Range | TextRange {
    if (env.isW3CRangeSupport) {
      const w3cRange = document.createRange();
      w3cRange.setStart(this.sc, this.so);
      // [battle-patch 9a9e01d3] clamp end offset to the text length to avoid
      // "Failed to execute 'setEnd' on 'Range'".
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      w3cRange.setEnd(this.ec, (this.ec as any).data ? Math.min(this.eo, (this.ec as any).data.length) : this.eo);

      return w3cRange;
    } else {
      const textRange = pointToTextRange({
        node: this.sc,
        offset: this.so,
      });

      textRange.setEndPoint('EndToEnd', pointToTextRange({
        node: this.ec,
        offset: this.eo,
      }));

      return textRange;
    }
  }

  getPoints(): BoundaryPoints {
    return {
      sc: this.sc,
      so: this.so,
      ec: this.ec,
      eo: this.eo,
    };
  }

  getStartPoint(): BoundaryPoint {
    return {
      node: this.sc,
      offset: this.so,
    };
  }

  getEndPoint(): BoundaryPoint {
    return {
      node: this.ec,
      offset: this.eo,
    };
  }

  /**
   * select update visible range
   */
  select(): this {
    const nativeRng = this.nativeRange();
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (selection!.rangeCount > 0) {
        selection!.removeAllRanges();
      }
      selection!.addRange(nativeRng as Range);
    } else {
      (nativeRng as TextRange).select();
    }

    return this;
  }

  /**
   * Moves the scrollbar to start container(sc) of current range
   *
   * @return {WrappedRange}
   */
  scrollIntoView(container: HTMLElement): this {
    const height = container.clientHeight;
    if (container.scrollTop + height < (this.sc as HTMLElement).offsetTop) {
      container.scrollTop += Math.abs(container.scrollTop + height - (this.sc as HTMLElement).offsetTop);
    }

    return this;
  }

  /**
   * @return {WrappedRange}
   */
  normalize(): WrappedRange {
    /**
     * @param {BoundaryPoint} point
     * @param {Boolean} isLeftToRight - true: prefer to choose right node
     *                                - false: prefer to choose left node
     * @return {BoundaryPoint}
     */
    const getVisiblePoint = function(point: BoundaryPoint, isLeftToRight: boolean): BoundaryPoint {
      if (!point) {
        return point;
      }

      // Just use the given point [XXX:Adhoc]
      //  - case 01. if the point is on the middle of the node
      //  - case 02. if the point is on the right edge and prefer to choose left node
      //  - case 03. if the point is on the left edge and prefer to choose right node
      //  - case 04. if the point is on the right edge and prefer to choose right node but the node is void
      //  - case 05. if the point is on the left edge and prefer to choose left node but the node is void
      //  - case 06. if the point is on the block node and there is no children
      if (dom.isVisiblePoint(point)) {
        if (!dom.isEdgePoint(point) ||
            (dom.isRightEdgePoint(point) && !isLeftToRight) ||
            (dom.isLeftEdgePoint(point) && isLeftToRight) ||
            (dom.isRightEdgePoint(point) && isLeftToRight && dom.isVoid(point.node.nextSibling)) ||
            (dom.isLeftEdgePoint(point) && !isLeftToRight && dom.isVoid(point.node.previousSibling)) ||
            (dom.isBlock(point.node) && dom.isEmpty(point.node))) {
          return point;
        }
      }

      // point on block's edge
      const block = dom.ancestor(point.node, dom.isBlock);
      let hasRightNode = false;

      if (!hasRightNode) {
        const prevPoint = dom.prevPoint(point) || { node: null };
        hasRightNode = (dom.isLeftEdgePointOf(point, block!) || dom.isVoid(prevPoint.node)) && !isLeftToRight;
      }

      let hasLeftNode = false;
      if (!hasLeftNode) {
        const nextPoint = dom.nextPoint(point) || { node: null };
        hasLeftNode = (dom.isRightEdgePointOf(point, block!) || dom.isVoid(nextPoint.node)) && isLeftToRight;
      }

      if (hasRightNode || hasLeftNode) {
        // returns point already on visible point
        if (dom.isVisiblePoint(point)) {
          return point;
        }
        // reverse direction
        isLeftToRight = !isLeftToRight;
      }

      const nextPoint = isLeftToRight ? dom.nextPointUntil(dom.nextPoint(point), dom.isVisiblePoint)
        : dom.prevPointUntil(dom.prevPoint(point), dom.isVisiblePoint);
      return nextPoint || point;
    };

    const endPoint = getVisiblePoint(this.getEndPoint(), false);
    const startPoint = this.isCollapsed() ? endPoint : getVisiblePoint(this.getStartPoint(), true);

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * returns matched nodes on range
   *
   * @param {Function} [pred] - predicate function
   * @param {Object} [options]
   * @param {Boolean} [options.includeAncestor]
   * @param {Boolean} [options.fullyContains]
   * @return {Node[]}
   */
  nodes(pred?: Pred | null, options?: NodesOptions): Node[] {
    pred = pred || func.ok;

    const includeAncestor = options && options.includeAncestor;
    const fullyContains = options && options.fullyContains;

    // TODO compare points and sort
    const startPoint = this.getStartPoint();
    const endPoint = this.getEndPoint();

    const nodes: Node[] = [];
    const leftEdgeNodes: Node[] = [];

    dom.walkPoint(startPoint, endPoint, function(point) {
      if (dom.isEditable(point.node)) {
        return;
      }

      let node: Node | null | undefined;
      if (fullyContains) {
        if (dom.isLeftEdgePoint(point)) {
          leftEdgeNodes.push(point.node);
        }
        if (dom.isRightEdgePoint(point) && lists.contains(leftEdgeNodes, point.node)) {
          node = point.node;
        }
      } else if (includeAncestor) {
        node = dom.ancestor(point.node, pred!);
      } else {
        node = point.node;
      }

      if (node && pred!(node)) {
        nodes.push(node);
      }
    }, true);

    return lists.unique(nodes);
  }

  /**
   * returns commonAncestor of range
   * @return {Element} - commonAncestor
   */
  commonAncestor(): Node | null {
    return dom.commonAncestor(this.sc, this.ec);
  }

  /**
   * returns expanded range by pred
   *
   * @param {Function} pred - predicate function
   * @return {WrappedRange}
   */
  expand(pred: Pred): WrappedRange {
    const startAncestor = dom.ancestor(this.sc, pred);
    const endAncestor = dom.ancestor(this.ec, pred);

    if (!startAncestor && !endAncestor) {
      return new WrappedRange(this.sc, this.so, this.ec, this.eo);
    }

    const boundaryPoints = this.getPoints();

    if (startAncestor) {
      boundaryPoints.sc = startAncestor;
      boundaryPoints.so = 0;
    }

    if (endAncestor) {
      boundaryPoints.ec = endAncestor;
      boundaryPoints.eo = dom.nodeLength(endAncestor);
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo
    );
  }

  /**
   * @param {Boolean} isCollapseToStart
   * @return {WrappedRange}
   */
  collapse(isCollapseToStart?: boolean): WrappedRange {
    if (isCollapseToStart) {
      return new WrappedRange(this.sc, this.so, this.sc, this.so);
    } else {
      return new WrappedRange(this.ec, this.eo, this.ec, this.eo);
    }
  }

  /**
   * splitText on range
   */
  splitText(): WrappedRange {
    const isSameContainer = this.sc === this.ec;
    const boundaryPoints = this.getPoints();

    if (dom.isText(this.ec) && !dom.isEdgePoint(this.getEndPoint())) {
      (this.ec as Text).splitText(this.eo);
    }

    if (dom.isText(this.sc) && !dom.isEdgePoint(this.getStartPoint())) {
      boundaryPoints.sc = (this.sc as Text).splitText(this.so);
      boundaryPoints.so = 0;

      if (isSameContainer) {
        boundaryPoints.ec = boundaryPoints.sc;
        boundaryPoints.eo = this.eo - this.so;
      }
    }

    return new WrappedRange(
      boundaryPoints.sc,
      boundaryPoints.so,
      boundaryPoints.ec,
      boundaryPoints.eo
    );
  }

  /**
   * delete contents on range
   * @return {WrappedRange}
   */
  deleteContents(): WrappedRange {
    if (this.isCollapsed()) {
      return this;
    }

    const rng = this.splitText();
    const nodes = rng.nodes(null, {
      fullyContains: true,
    });

    // find new cursor point
    const point = dom.prevPointUntil(rng.getStartPoint(), function(point) {
      return !lists.contains(nodes, point.node);
    })!;

    const emptyParents: Node[] = [];
    for (const node of nodes) {
      // find empty parents
      const parent = node.parentNode!;
      if (point.node !== parent && dom.nodeLength(parent) === 1) {
        emptyParents.push(parent);
      }
      dom.remove(node, false);
    }

    // remove empty parents
    for (const node of emptyParents) {
      dom.remove(node, false);
    }

    return new WrappedRange(
      point.node,
      point.offset,
      point.node,
      point.offset
    ).normalize();
  }

  /**
   * makeIsOn: return isOn(pred) function
   */
  makeIsOn(pred: Pred): () => boolean {
    const self = this;
    return function(): boolean {
      const ancestor = dom.ancestor(self.sc, pred);
      return !!ancestor && (ancestor === dom.ancestor(self.ec, pred));
    };
  }

  /**
   * @param {Function} pred
   * @return {Boolean}
   */
  isLeftEdgeOf(pred: Pred): boolean {
    if (!dom.isLeftEdgePoint(this.getStartPoint())) {
      return false;
    }

    const node = dom.ancestor(this.sc, pred);
    return !!node && dom.isLeftEdgeOf(this.sc, node);
  }

  /**
   * returns whether range was collapsed or not
   */
  isCollapsed(): boolean {
    return this.sc === this.ec && this.so === this.eo;
  }

  /**
   * wrap inline nodes which children of body with paragraph
   *
   * @return {WrappedRange}
   */
  wrapBodyInlineWithPara(): WrappedRange {
    if (dom.isBodyContainer(this.sc) && dom.isEmpty(this.sc)) {
      (this.sc as Element).innerHTML = dom.emptyPara;
      return new WrappedRange(this.sc.firstChild!, 0, this.sc.firstChild!, 0);
    }

    /**
     * [workaround] firefox often create range on not visible point. so normalize here.
     *  - firefox: |<p>text</p>|
     *  - chrome: <p>|text|</p>
     */
    const rng = this.normalize();
    if (dom.isParaInline(this.sc) || dom.isPara(this.sc)) {
      return rng;
    }

    // find inline top ancestor
    let topAncestor: Node;
    if (dom.isInline(rng.sc)) {
      const ancestors = dom.listAncestor(rng.sc, func.not(dom.isInline));
      topAncestor = lists.last(ancestors);
      if (!dom.isInline(topAncestor)) {
        topAncestor = ancestors[ancestors.length - 2] || rng.sc.childNodes[rng.so];
      }
    } else {
      topAncestor = rng.sc.childNodes[rng.so > 0 ? rng.so - 1 : 0];
    }

    if (topAncestor) {
      // siblings not in paragraph
      let inlineSiblings = dom.listPrev(topAncestor, dom.isParaInline).reverse();
      inlineSiblings = inlineSiblings.concat(dom.listNext(topAncestor.nextSibling, dom.isParaInline));

      // wrap with paragraph
      if (inlineSiblings.length) {
        const para = dom.wrap(lists.head(inlineSiblings), 'p');
        dom.appendChildNodes(para, lists.tail(inlineSiblings));
      }
    }

    return this.normalize();
  }

  /**
   * insert node at current cursor
   *
   * @param {Node} node
   * @param {Boolean} doNotInsertPara - default is false, removes added <p> that's added if true
   * @return {Node}
   */
  insertNode(node: Node, doNotInsertPara = false): Node {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let rng: WrappedRange = this;

    if (dom.isText(node) || dom.isInline(node)) {
      rng = this.wrapBodyInlineWithPara().deleteContents();
    }

    const info = dom.splitPoint(rng.getStartPoint(), dom.isInline(node));
    if (info.rightNode) {
      info.rightNode.parentNode!.insertBefore(node, info.rightNode);
      if (dom.isEmpty(info.rightNode) && (doNotInsertPara || dom.isPara(node))) {
        info.rightNode.parentNode!.removeChild(info.rightNode);
      }
    } else {
      info.container.appendChild(node);
    }

    return node;
  }

  /**
   * insert html at current cursor
   */
  pasteHTML(markup: string): Node[] {
    markup = ((markup || '') + '').trim();

    const contentsContainer = dom.create('div');
    contentsContainer.innerHTML = markup;
    let childNodes: Node[] = lists.from(contentsContainer.childNodes);

    // const rng = this.wrapBodyInlineWithPara().deleteContents();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const rng = this;
    let reversed = false;

    if (rng.so >= 0) {
      childNodes = childNodes.reverse();
      reversed = true;
    }

    childNodes = childNodes.map(function(childNode) {
      return rng.insertNode(childNode, !dom.isInline(childNode));
    });

    if (reversed) {
      childNodes = childNodes.reverse();
    }
    return childNodes;
  }

  /**
   * returns text in range
   *
   * @return {String}
   */
  toString(): string {
    const nativeRng = this.nativeRange();
    return env.isW3CRangeSupport ? (nativeRng as Range).toString() : (nativeRng as TextRange).text;
  }

  /**
   * returns range for word before cursor
   *
   * @param {Boolean} [findAfter] - find after cursor, default: false
   * @return {WrappedRange}
   */
  getWordRange(findAfter?: boolean): WrappedRange {
    let endPoint = this.getEndPoint();

    if (!dom.isCharPoint(endPoint)) {
      return this as unknown as WrappedRange;
    }

    const startPoint = dom.prevPointUntil(endPoint, function(point) {
      return !dom.isCharPoint(point);
    })!;

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, function(point) {
        return !dom.isCharPoint(point);
      })!;
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * returns range for words before cursor
   *
   * @param {Boolean} [findAfter] - find after cursor, default: false
   * @return {WrappedRange}
   */
  getWordsRange(findAfter?: boolean): WrappedRange {
    let endPoint = this.getEndPoint();

    const isNotTextPoint = function(point: BoundaryPoint): boolean {
      return !dom.isCharPoint(point) && !dom.isSpacePoint(point);
    };

    if (isNotTextPoint(endPoint)) {
      return this as unknown as WrappedRange;
    }

    const startPoint = dom.prevPointUntil(endPoint, isNotTextPoint)!;

    if (findAfter) {
      endPoint = dom.nextPointUntil(endPoint, isNotTextPoint)!;
    }

    return new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );
  }

  /**
   * returns range for words before cursor that match with a Regex
   *
   * example:
   *  range: 'hi @Peter Pan'
   *  regex: '/@[a-z ]+/i'
   *  return range: '@Peter Pan'
   *
   * @param {RegExp} [regex]
   * @return {WrappedRange|null}
   */
  getWordsMatchRange(regex: RegExp): WrappedRange | null {
    const endPoint = this.getEndPoint();

    const startPoint = dom.prevPointUntil(endPoint, function(point) {
      if (!dom.isCharPoint(point) && !dom.isSpacePoint(point)) {
        return true;
      }
      const rng = new WrappedRange(
        point.node,
        point.offset,
        endPoint.node,
        endPoint.offset
      );
      const result = regex.exec(rng.toString());
      return !!result && result.index === 0;
    })!;

    const rng = new WrappedRange(
      startPoint.node,
      startPoint.offset,
      endPoint.node,
      endPoint.offset
    );

    const text = rng.toString();
    const result = regex.exec(text);

    if (result && result[0].length === text.length) {
      return rng;
    } else {
      return null;
    }
  }

  /**
   * create offsetPath bookmark
   *
   * @param {Node} editable
   */
  bookmark(editable: Node): Bookmark {
    return {
      s: {
        path: dom.makeOffsetPath(editable, this.sc),
        offset: this.so,
      },
      e: {
        path: dom.makeOffsetPath(editable, this.ec),
        offset: this.eo,
      },
    };
  }

  /**
   * create offsetPath bookmark base on paragraph
   *
   * @param {Node[]} paras
   */
  paraBookmark(paras: Node[]): Bookmark {
    return {
      s: {
        path: lists.tail(dom.makeOffsetPath(lists.head(paras), this.sc)),
        offset: this.so,
      },
      e: {
        path: lists.tail(dom.makeOffsetPath(lists.last(paras), this.ec)),
        offset: this.eo,
      },
    };
  }

  /**
   * getClientRects
   * @return {Rect[]}
   */
  getClientRects(): DOMRectList {
    const nativeRng = this.nativeRange();
    return (nativeRng as Range).getClientRects();
  }
}

/**
 * Data structure
 *  * BoundaryPoint: a point of dom tree
 *  * BoundaryPoints: two boundaryPoints corresponding to the start and the end of the Range
 *
 * See to http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html#Level-2-Range-Position
 */
const range = {
  /**
   * create Range Object From arguments or Browser Selection
   *
   * @param {Node} sc - start container
   * @param {Number} so - start offset
   * @param {Node} ec - end container
   * @param {Number} eo - end offset
   * @return {WrappedRange}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: function(sc?: any, so?: any, ec?: any, eo?: any): WrappedRange | null {
    // eslint-disable-next-line prefer-rest-params
    const args = arguments;
    if (args.length === 4) {
      return new WrappedRange(sc, so, ec, eo);
    } else if (args.length === 2) { // collapsed
      ec = sc;
      eo = so;
      return new WrappedRange(sc, so, ec, eo);
    } else {
      const wrappedRange = this.createFromSelection();

      if (!wrappedRange && args.length === 1) {
        let bodyElement = args[0];
        if (dom.isEditable(bodyElement)) {
          bodyElement = bodyElement.lastChild;
        }
        return this.createFromBodyElement(bodyElement, dom.emptyPara === args[0].innerHTML);
      }
      return wrappedRange;
    }
  },

  createFromBodyElement: function(bodyElement: Node, isCollapseToStart = false): WrappedRange {
    const wrappedRange = this.createFromNode(bodyElement);
    return wrappedRange.collapse(isCollapseToStart);
  },

  createFromSelection: function(): WrappedRange | null {
    let sc: Node, so: number, ec: Node, eo: number;
    if (env.isW3CRangeSupport) {
      const selection = document.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      } else if (dom.isBody(selection.anchorNode)) {
        // Firefox: returns entire body as range on initialization.
        // We won't never need it.
        return null;
      }

      const nativeRng = selection.getRangeAt(0);
      sc = nativeRng.startContainer;
      so = nativeRng.startOffset;
      ec = nativeRng.endContainer;
      eo = nativeRng.endOffset;
    } else { // IE8: TextRange
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textRange = (document as any).selection.createRange();
      const textRangeEnd = textRange.duplicate();
      textRangeEnd.collapse(false);
      const textRangeStart = textRange;
      textRangeStart.collapse(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let startPoint: any = textRangeToPoint(textRangeStart, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const endPoint: any = textRangeToPoint(textRangeEnd, false);

      // same visible point case: range was collapsed.
      if (dom.isText(startPoint.node) && dom.isLeftEdgePoint(startPoint) &&
        (dom as any).isTextNode(endPoint.node) && dom.isRightEdgePoint(endPoint) &&
        endPoint.node.nextSibling === startPoint.node) {
        startPoint = endPoint;
      }

      sc = startPoint.cont;
      so = startPoint.offset;
      ec = endPoint.cont;
      eo = endPoint.offset;
    }

    return new WrappedRange(sc, so, ec, eo);
  },

  /**
   * @method
   *
   * create WrappedRange from node
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNode: function(node: Node): WrappedRange {
    let sc = node;
    let so = 0;
    let ec = node;
    let eo = dom.nodeLength(ec);

    // browsers can't target a picture or void node
    if (dom.isVoid(sc)) {
      so = dom.listPrev(sc).length - 1;
      sc = sc.parentNode!;
    }
    if (dom.isBR(ec)) {
      eo = dom.listPrev(ec).length - 1;
      ec = ec.parentNode!;
    } else if (dom.isVoid(ec)) {
      eo = dom.listPrev(ec).length;
      ec = ec.parentNode!;
    }

    return this.create(sc, so, ec, eo)!;
  },

  /**
   * create WrappedRange from node after position
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNodeBefore: function(node: Node): WrappedRange {
    return this.createFromNode(node).collapse(true);
  },

  /**
   * create WrappedRange from node after position
   *
   * @param {Node} node
   * @return {WrappedRange}
   */
  createFromNodeAfter: function(node: Node): WrappedRange {
    return this.createFromNode(node).collapse();
  },

  /**
   * @method
   *
   * create WrappedRange from bookmark
   *
   * @param {Node} editable
   * @param {Object} bookmark
   * @return {WrappedRange}
   */
  createFromBookmark: function(editable: Node, bookmark: Bookmark): WrappedRange {
    const sc = dom.fromOffsetPath(editable, bookmark.s.path);
    const so = bookmark.s.offset;
    const ec = dom.fromOffsetPath(editable, bookmark.e.path);
    const eo = bookmark.e.offset;
    return new WrappedRange(sc, so, ec, eo);
  },

  /**
   * @method
   *
   * create WrappedRange from paraBookmark
   *
   * @param {Object} bookmark
   * @param {Node[]} paras
   * @return {WrappedRange}
   */
  createFromParaBookmark: function(bookmark: Bookmark, paras: Node[]): WrappedRange {
    const so = bookmark.s.offset;
    const eo = bookmark.e.offset;
    const sc = dom.fromOffsetPath(lists.head(paras), bookmark.s.path);
    const ec = dom.fromOffsetPath(lists.last(paras), bookmark.e.path);

    return new WrappedRange(sc, so, ec, eo);
  },
};

export default range;
