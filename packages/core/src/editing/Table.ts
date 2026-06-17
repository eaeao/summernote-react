/**
 * editing.Table
 * Ported 1:1 from src/js/editing/Table.js (jQuery removed: all idioms replaced with native DOM).
 *
 * Preserves TableResultAction and its virtual-grid algorithm (colspan/rowspan recalculation)
 * exactly as the legacy implementation. Stateless: no editor-context constructor.
 */
import dom from '../core/dom';
import range from '../core/range';
import lists from '../core/lists';

/**
 * Position info object stored in the virtual table grid.
 */
interface VirtualTablePosition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseRow: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseCell: any;
  isRowSpan: boolean;
  isColSpan: boolean;
  isVirtual: boolean;
}

/**
 * Action cell object returned by getActionList().
 */
interface ActionCell {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseCell: any;
  action: number;
  virtualTable: {
    rowIndex: number;
    cellIndex: number;
  };
}

interface TableResultActionStatics {
  where: { Row: number; Column: number };
  requestAction: { Add: number; Delete: number };
  resultAction: {
    Ignore: number;
    SubtractSpanCount: number;
    RemoveCell: number;
    AddCell: number;
    SumSpanCount: number;
  };
}

interface TableResultActionInstance {
  getActionList(): ActionCell[];
}

interface TableResultActionConstructor extends TableResultActionStatics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (startPoint: any, where: number, action: number, domTable: any): TableResultActionInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (startPoint: any, where: number, action: number, domTable: any): void;
}

/**
 * @class Create a virtual table to create what actions to do in change.
 * @param {object} startPoint Cell selected to apply change.
 * @param {enum} where  Where change will be applied Row or Col. Use enum: TableResultAction.where
 * @param {enum} action Action to be applied. Use enum: TableResultAction.requestAction
 * @param {object} domTable Dom element of table to make changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TableResultAction = function(this: any, startPoint: any, where: number, action: number, domTable: any): void {
  const _startPoint = { 'colPos': 0, 'rowPos': 0 };
  const _virtualTable: VirtualTablePosition[][] = [];
  const _actionCellList: ActionCell[] = [];

  /// ///////////////////////////////////////////
  // Private functions
  /// ///////////////////////////////////////////

  /**
   * Set the startPoint of action.
   */
  function setStartPoint() {
    if (!startPoint || !startPoint.tagName || (startPoint.tagName.toLowerCase() !== 'td' && startPoint.tagName.toLowerCase() !== 'th')) {
      // Impossible to identify start Cell point
      return;
    }
    _startPoint.colPos = startPoint.cellIndex;
    if (!startPoint.parentElement || !startPoint.parentElement.tagName || startPoint.parentElement.tagName.toLowerCase() !== 'tr') {
      // Impossible to identify start Row point
      return;
    }
    _startPoint.rowPos = startPoint.parentElement.rowIndex;
  }

  /**
   * Define virtual table position info object.
   *
   * @param {int} rowIndex Index position in line of virtual table.
   * @param {int} cellIndex Index position in column of virtual table.
   * @param {object} baseRow Row affected by this position.
   * @param {object} baseCell Cell affected by this position.
   * @param {bool} isSpan Inform if it is an span cell/row.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function setVirtualTablePosition(rowIndex: number, cellIndex: number, baseRow: any, baseCell: any, isRowSpan: boolean, isColSpan: boolean, isVirtualCell: boolean) {
    const objPosition: VirtualTablePosition = {
      'baseRow': baseRow,
      'baseCell': baseCell,
      'isRowSpan': isRowSpan,
      'isColSpan': isColSpan,
      'isVirtual': isVirtualCell,
    };
    if (!_virtualTable[rowIndex]) {
      _virtualTable[rowIndex] = [];
    }
    _virtualTable[rowIndex][cellIndex] = objPosition;
  }

  /**
   * Create action cell object.
   *
   * @param {object} virtualTableCellObj Object of specific position on virtual table.
   * @param {enum} resultAction Action to be applied in that item.
   */
  function getActionCell(virtualTableCellObj: VirtualTablePosition, resultAction: number, virtualRowPosition: number, virtualColPosition: number): ActionCell {
    return {
      'baseCell': virtualTableCellObj.baseCell,
      'action': resultAction,
      'virtualTable': {
        'rowIndex': virtualRowPosition,
        'cellIndex': virtualColPosition,
      },
    };
  }

  /**
   * Recover free index of row to append Cell.
   *
   * @param {int} rowIndex Index of row to find free space.
   * @param {int} cellIndex Index of cell to find free space in table.
   */
  function recoverCellIndex(rowIndex: number, cellIndex: number): number | undefined {
    if (!_virtualTable[rowIndex]) {
      return cellIndex;
    }
    if (!_virtualTable[rowIndex][cellIndex]) {
      return cellIndex;
    }

    let newCellIndex = cellIndex;
    while (_virtualTable[rowIndex][newCellIndex]) {
      newCellIndex++;
      if (!_virtualTable[rowIndex][newCellIndex]) {
        return newCellIndex;
      }
    }
    return undefined;
  }

  /**
   * Recover info about row and cell and add information to virtual table.
   *
   * @param {object} row Row to recover information.
   * @param {object} cell Cell to recover information.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function addCellInfoToVirtual(row: any, cell: any) {
    const cellIndex = recoverCellIndex(row.rowIndex, cell.cellIndex) as number;
    const cellHasColspan = (cell.colSpan > 1);
    const cellHasRowspan = (cell.rowSpan > 1);
    const isThisSelectedCell = (row.rowIndex === _startPoint.rowPos && cell.cellIndex === _startPoint.colPos);
    setVirtualTablePosition(row.rowIndex, cellIndex, row, cell, cellHasRowspan, cellHasColspan, false);

    // Add span rows to virtual Table.
    const rowspanNumber = cell.attributes.rowSpan ? parseInt(cell.attributes.rowSpan.value, 10) : 0;
    if (rowspanNumber > 1) {
      for (let rp = 1; rp < rowspanNumber; rp++) {
        const rowspanIndex = row.rowIndex + rp;
        adjustStartPoint(rowspanIndex, cellIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(rowspanIndex, cellIndex, row, cell, true, cellHasColspan, true);
      }
    }

    // Add span cols to virtual table.
    const colspanNumber = cell.attributes.colSpan ? parseInt(cell.attributes.colSpan.value, 10) : 0;
    if (colspanNumber > 1) {
      for (let cp = 1; cp < colspanNumber; cp++) {
        const cellspanIndex = recoverCellIndex(row.rowIndex, (cellIndex + cp)) as number;
        adjustStartPoint(row.rowIndex, cellspanIndex, cell, isThisSelectedCell);
        setVirtualTablePosition(row.rowIndex, cellspanIndex, row, cell, cellHasRowspan, true, true);
      }
    }
  }

  /**
   * Process validation and adjust of start point if needed
   *
   * @param {int} rowIndex
   * @param {int} cellIndex
   * @param {object} cell
   * @param {bool} isSelectedCell
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function adjustStartPoint(rowIndex: number, cellIndex: number, cell: any, isSelectedCell: boolean) {
    if (rowIndex === _startPoint.rowPos && _startPoint.colPos >= cell.cellIndex && cell.cellIndex <= cellIndex && !isSelectedCell) {
      _startPoint.colPos++;
    }
  }

  /**
   * Create virtual table of cells with all cells, including span cells.
   */
  function createVirtualTable() {
    const rows = domTable.rows;
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const cells = rows[rowIndex].cells;
      for (let cellIndex = 0; cellIndex < cells.length; cellIndex++) {
        addCellInfoToVirtual(rows[rowIndex], cells[cellIndex]);
      }
    }
  }

  /**
   * Get action to be applied on the cell.
   *
   * @param {object} cell virtual table cell to apply action
   */
  function getDeleteResultActionToCell(cell: VirtualTablePosition): number {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
      case TableResultAction.where.Row:
        if (!cell.isVirtual && cell.isRowSpan) {
          return TableResultAction.resultAction.AddCell;
        } else if (cell.isRowSpan) {
          return TableResultAction.resultAction.SubtractSpanCount;
        }
        break;
    }
    return TableResultAction.resultAction.RemoveCell;
  }

  /**
   * Get action to be applied on the cell.
   *
   * @param {object} cell virtual table cell to apply action
   */
  function getAddResultActionToCell(cell: VirtualTablePosition): number {
    switch (where) {
      case TableResultAction.where.Column:
        if (cell.isColSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isRowSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
      case TableResultAction.where.Row:
        if (cell.isRowSpan) {
          return TableResultAction.resultAction.SumSpanCount;
        } else if (cell.isColSpan && cell.isVirtual) {
          return TableResultAction.resultAction.Ignore;
        }
        break;
    }
    return TableResultAction.resultAction.AddCell;
  }

  function init() {
    setStartPoint();
    createVirtualTable();
  }

  /// ///////////////////////////////////////////
  // Public functions
  /// ///////////////////////////////////////////

  /**
   * Recover array os what to do in table.
   */
  this.getActionList = function(): ActionCell[] {
    const fixedRow = (where === TableResultAction.where.Row) ? _startPoint.rowPos : -1;
    const fixedCol = (where === TableResultAction.where.Column) ? _startPoint.colPos : -1;

    let actualPosition = 0;
    let canContinue = true;
    while (canContinue) {
      const rowPosition = (fixedRow >= 0) ? fixedRow : actualPosition;
      const colPosition = (fixedCol >= 0) ? fixedCol : actualPosition;
      const row = _virtualTable[rowPosition];
      if (!row) {
        canContinue = false;
        return _actionCellList;
      }
      const cell = row[colPosition];
      if (!cell) {
        canContinue = false;
        return _actionCellList;
      }

      // Define action to be applied in this cell
      let resultAction = TableResultAction.resultAction.Ignore;
      switch (action) {
        case TableResultAction.requestAction.Add:
          resultAction = getAddResultActionToCell(cell);
          break;
        case TableResultAction.requestAction.Delete:
          resultAction = getDeleteResultActionToCell(cell);
          break;
      }
      _actionCellList.push(getActionCell(cell, resultAction, rowPosition, colPosition));
      actualPosition++;
    }

    return _actionCellList;
  };

  init();
} as unknown as TableResultActionConstructor;
/**
*
* Where action occours enum.
*/
TableResultAction.where = { 'Row': 0, 'Column': 1 };
/**
*
* Requested action to apply enum.
*/
TableResultAction.requestAction = { 'Add': 0, 'Delete': 1 };
/**
*
* Result action to be executed enum.
*/
TableResultAction.resultAction = { 'Ignore': 0, 'SubtractSpanCount': 1, 'RemoveCell': 2, 'AddCell': 3, 'SumSpanCount': 4 };

/**
 * Native replacement for jQuery $(node).closest(selector). Walks up from `node`
 * (inclusive) returning the nearest ancestor matching the tagName, or null.
 */
function closest(node: Node | null, tagName: string): HTMLElement | null {
  let el: Node | null = node;
  const upper = tagName.toUpperCase();
  while (el) {
    if (el.nodeType === 1 && (el as Element).nodeName.toUpperCase() === upper) {
      return el as HTMLElement;
    }
    el = el.parentNode;
  }
  return null;
}

/**
 *
 * @class editing.Table
 *
 * Table
 *
 */
export class Table {
  /**
   * handle tab key
   *
   * @param {WrappedRange} rng
   * @param {Boolean} isShift
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tab(rng: any, isShift?: boolean): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const table = dom.ancestor(cell, dom.isTable);
    const cells = dom.listDescendant(table!, dom.isCell);

    const nextCell = (lists as unknown as Record<string, (arr: Node[], item: Node) => Node | undefined>)[isShift ? 'prev' : 'next'](cells, cell!);
    if (nextCell) {
      range.create(nextCell, 0)!.select();
    }
  }

  /**
   * Add a new row
   *
   * @param {WrappedRange} rng
   * @param {String} position (top/bottom)
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addRow(rng: any, position?: string): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell) as HTMLTableCellElement;

    const currentTr = closest(cell, 'tr') as HTMLTableRowElement;
    const trAttributes = this.recoverAttributes(currentTr);
    const html = this.fromHTML('<tr' + trAttributes + '></tr>') as HTMLTableRowElement;

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Add, closest(currentTr, 'table'));
    const actions = vTable.getActionList();

    for (let idCell = 0; idCell < actions.length; idCell++) {
      const currentCell = actions[idCell];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          this.appendHTML(html, '<td' + tdAttributes + '>' + dom.blank + '</td>');
          break;
        case TableResultAction.resultAction.SumSpanCount:
          {
            if (position === 'top') {
              const baseCellTr = currentCell.baseCell.parent;
              const isTopFromRowSpan = (!baseCellTr ? 0 : (closest(currentCell.baseCell, 'tr') as HTMLTableRowElement).rowIndex) <= currentTr.rowIndex;
              if (isTopFromRowSpan) {
                const newTdEl = this.fromHTML('<td' + tdAttributes + '>' + dom.blank + '</td>') as HTMLTableCellElement;
                newTdEl.removeAttribute('rowspan');
                const newTd = newTdEl.outerHTML;
                this.appendHTML(html, newTd);
                break;
              }
            }
            let rowspanNumber = parseInt(currentCell.baseCell.rowSpan, 10);
            rowspanNumber++;
            currentCell.baseCell.setAttribute('rowSpan', rowspanNumber);
          }
          break;
      }
    }

    if (position === 'top') {
      currentTr.parentNode!.insertBefore(html, currentTr);
    } else {
      const cellHasRowspan = (cell.rowSpan > 1);
      if (cellHasRowspan) {
        const lastTrIndex = currentTr.rowIndex + (cell.rowSpan - 2);
        const trs = (currentTr.parentNode as Element).querySelectorAll('tr');
        const lastTr = trs[lastTrIndex] as HTMLTableRowElement;
        lastTr.parentNode!.insertBefore(html, lastTr.nextSibling);
        return;
      }
      currentTr.parentNode!.insertBefore(html, currentTr.nextSibling);
    }
  }

  /**
   * Add a new col
   *
   * @param {WrappedRange} rng
   * @param {String} position (left/right)
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCol(rng: any, position?: string): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell) as HTMLTableCellElement;
    const row = closest(cell, 'tr') as HTMLTableRowElement;

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Add, closest(row, 'table'));
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      const currentCell = actions[actionIndex];
      const tdAttributes = this.recoverAttributes(currentCell.baseCell);
      switch (currentCell.action) {
        case TableResultAction.resultAction.AddCell:
          if (position === 'right') {
            this.insertAdjacentHTML(currentCell.baseCell, 'afterend', '<td' + tdAttributes + '>' + dom.blank + '</td>');
          } else {
            this.insertAdjacentHTML(currentCell.baseCell, 'beforebegin', '<td' + tdAttributes + '>' + dom.blank + '</td>');
          }
          break;
        case TableResultAction.resultAction.SumSpanCount:
          if (position === 'right') {
            let colspanNumber = parseInt(currentCell.baseCell.colSpan, 10);
            colspanNumber++;
            currentCell.baseCell.setAttribute('colSpan', colspanNumber);
          } else {
            this.insertAdjacentHTML(currentCell.baseCell, 'beforebegin', '<td' + tdAttributes + '>' + dom.blank + '</td>');
          }
          break;
      }
    }
  }

  /*
  * Copy attributes from element.
  *
  * @param {object} Element to recover attributes.
  * @return {string} Copied string elements.
  */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recoverAttributes(el: any): string {
    let resultStr = '';

    if (!el) {
      return resultStr;
    }

    const attrList = el.attributes || [];

    for (let i = 0; i < attrList.length; i++) {
      if (attrList[i].name.toLowerCase() === 'id') {
        continue;
      }

      if (attrList[i].specified) {
        resultStr += ' ' + attrList[i].name + '=\'' + attrList[i].value + '\'';
      }
    }

    return resultStr;
  }

  /**
   * Delete current row
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteRow(rng: any): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell) as HTMLTableCellElement;
    const row = closest(cell, 'tr') as HTMLTableRowElement;
    const cellPos = this.childrenIndex(row, cell);
    const rowPos = row.rowIndex;

    const vTable = new TableResultAction(cell, TableResultAction.where.Row,
      TableResultAction.requestAction.Delete, closest(row, 'table'));
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      if (!actions[actionIndex]) {
        continue;
      }

      const baseCell = actions[actionIndex].baseCell;
      const virtualPosition = actions[actionIndex].virtualTable;
      const hasRowspan = (baseCell.rowSpan && baseCell.rowSpan > 1);
      let rowspanNumber = (hasRowspan) ? parseInt(baseCell.rowSpan, 10) : 0;
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.Ignore:
          continue;
        case TableResultAction.resultAction.AddCell:
          {
            const nextRow = this.nextTr(row);
            if (!nextRow) { continue; }
            const cloneRow = row.cells[cellPos];
            if (hasRowspan) {
              if (rowspanNumber > 2) {
                rowspanNumber--;
                nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
                nextRow.cells[cellPos].setAttribute('rowSpan', String(rowspanNumber));
                nextRow.cells[cellPos].innerHTML = '';
              } else if (rowspanNumber === 2) {
                nextRow.insertBefore(cloneRow, nextRow.cells[cellPos]);
                nextRow.cells[cellPos].removeAttribute('rowSpan');
                nextRow.cells[cellPos].innerHTML = '';
              }
            }
          }
          continue;
        case TableResultAction.resultAction.SubtractSpanCount:
          if (hasRowspan) {
            if (rowspanNumber > 2) {
              rowspanNumber--;
              baseCell.setAttribute('rowSpan', rowspanNumber);
              if (virtualPosition.rowIndex !== rowPos && baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            } else if (rowspanNumber === 2) {
              baseCell.removeAttribute('rowSpan');
              if (virtualPosition.rowIndex !== rowPos && baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
            }
          }
          continue;
        case TableResultAction.resultAction.RemoveCell:
          // Do not need remove cell because row will be deleted.
          continue;
      }
    }
    row.remove();
  }

  /**
   * Delete current col
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteCol(rng: any): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell) as HTMLTableCellElement;
    const row = closest(cell, 'tr') as HTMLTableRowElement;
    const cellPos = this.childrenIndex(row, cell);

    const vTable = new TableResultAction(cell, TableResultAction.where.Column,
      TableResultAction.requestAction.Delete, closest(row, 'table'));
    const actions = vTable.getActionList();

    for (let actionIndex = 0; actionIndex < actions.length; actionIndex++) {
      if (!actions[actionIndex]) {
        continue;
      }
      switch (actions[actionIndex].action) {
        case TableResultAction.resultAction.Ignore:
          continue;
        case TableResultAction.resultAction.SubtractSpanCount:
          {
            const baseCell = actions[actionIndex].baseCell;
            const hasColspan = (baseCell.colSpan && baseCell.colSpan > 1);
            if (hasColspan) {
              let colspanNumber = (baseCell.colSpan) ? parseInt(baseCell.colSpan, 10) : 0;
              if (colspanNumber > 2) {
                colspanNumber--;
                baseCell.setAttribute('colSpan', colspanNumber);
                if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
              } else if (colspanNumber === 2) {
                baseCell.removeAttribute('colSpan');
                if (baseCell.cellIndex === cellPos) { baseCell.innerHTML = ''; }
              }
            }
          }
          continue;
        case TableResultAction.resultAction.RemoveCell:
          dom.remove(actions[actionIndex].baseCell, true);
          continue;
      }
    }
  }

  /**
   * create empty table element
   *
   * @param {Number} rowCount
   * @param {Number} colCount
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTable(colCount: number, rowCount: number, options?: any): HTMLTableElement {
    const tds = [];
    let tdHTML;
    for (let idxCol = 0; idxCol < colCount; idxCol++) {
      tds.push('<td>' + dom.blank + '</td>');
    }
    tdHTML = tds.join('');

    const trs = [];
    let trHTML;
    for (let idxRow = 0; idxRow < rowCount; idxRow++) {
      trs.push('<tr>' + tdHTML + '</tr>');
    }
    trHTML = trs.join('');
    const $table = this.fromHTML('<table>' + trHTML + '</table>') as HTMLTableElement;
    if (options && options.tableClassName) {
      // jQuery .addClass accepts space-separated classes; classList.add rejects them — split.
      for (const cls of String(options.tableClassName).split(/\s+/)) {
        if (cls) {
          $table.classList.add(cls);
        }
      }
    }

    return $table;
  }

  /**
   * Delete current table
   *
   * @param {WrappedRange} rng
   * @return {Node}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deleteTable(rng: any): void {
    const cell = dom.ancestor(rng.commonAncestor(), dom.isCell);
    const table = closest(cell, 'table');
    if (table) {
      table.remove();
    }
  }

  /// ///////////////////////////////////////////
  // Native DOM helpers (replacing jQuery idioms)
  /// ///////////////////////////////////////////

  /**
   * Build an element from an HTML string, returning its first element child.
   * Replaces jQuery $('<tag>...').
   */
  private fromHTML(html: string): HTMLElement {
    const tag = (html.trim().match(/^<\s*([a-z0-9]+)/i)?.[1] ?? '').toLowerCase();
    // <tr>/<td>/<th> are discarded by innerHTML outside a table context (jQuery special-cased
    // this); parse them inside a real table so the node survives, then dig it back out.
    if (tag === 'tr' || tag === 'td' || tag === 'th') {
      const wrap =
        tag === 'tr'
          ? ['<table><tbody>', '</tbody></table>']
          : ['<table><tbody><tr>', '</tr></tbody></table>'];
      const host = document.createElement('div');
      host.innerHTML = wrap[0] + html + wrap[1];
      return host.querySelector(tag) as HTMLElement;
    }
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.firstElementChild as HTMLElement;
  }

  /**
   * Append an HTML fragment as children of the given element.
   * Replaces jQuery $el.append(htmlString).
   */
  private appendHTML(el: HTMLElement, html: string): void {
    el.insertAdjacentHTML('beforeend', html);
  }

  /**
   * Insert an HTML fragment at a position relative to the given element.
   * Replaces jQuery $(el).after()/$(el).before().
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private insertAdjacentHTML(el: any, where: InsertPosition, html: string): void {
    (el as HTMLElement).insertAdjacentHTML(where, html);
  }

  /**
   * Index of `cell` among `td, th` children of `row`.
   * Replaces jQuery row.children('td, th').index($(cell)).
   */
  private childrenIndex(row: HTMLTableRowElement, cell: HTMLTableCellElement): number {
    const children: Element[] = [];
    for (let i = 0; i < row.children.length; i++) {
      const child = row.children[i];
      const name = child.nodeName.toLowerCase();
      if (name === 'td' || name === 'th') {
        children.push(child);
      }
    }
    return children.indexOf(cell);
  }

  /**
   * Next sibling `tr` of `row`.
   * Replaces jQuery row.next('tr')[0].
   */
  private nextTr(row: HTMLTableRowElement): HTMLTableRowElement | null {
    let sibling: Element | null = row.nextElementSibling;
    while (sibling) {
      if (sibling.nodeName.toLowerCase() === 'tr') {
        return sibling as HTMLTableRowElement;
      }
      sibling = sibling.nextElementSibling;
    }
    return null;
  }
}

export default Table;
