import range from '../core/range';

export interface HistoryOptions {
  historyLimit: number;
}

interface BookmarkPoint {
  path: number[];
  offset: number;
}

interface Bookmark {
  s: BookmarkPoint;
  e: BookmarkPoint;
}

interface Snapshot {
  contents: string;
  bookmark: Bookmark;
}

export class History {
  private stack: Snapshot[];
  private stackOffset: number;
  private options: HistoryOptions;
  private editable: HTMLElement;

  constructor(editable: HTMLElement, options: HistoryOptions) {
    this.stack = [];
    this.stackOffset = -1;
    this.options = options;
    this.editable = editable;
  }

  makeSnapshot(): Snapshot {
    const rng = range.create(this.editable);
    const emptyBookmark: Bookmark = { s: { path: [], offset: 0 }, e: { path: [], offset: 0 } };

    return {
      contents: this.editable.innerHTML,
      bookmark: ((rng && rng.isOnEditable()) ? rng.bookmark(this.editable) : emptyBookmark),
    };
  }

  applySnapshot(snapshot: Snapshot): void {
    if (snapshot.contents !== null) {
      this.editable.innerHTML = snapshot.contents;
    }
    if (snapshot.bookmark !== null) {
      range.createFromBookmark(this.editable, snapshot.bookmark).select();
    }
  }

  /**
  * @method rewind
  * Rewinds the history stack back to the first snapshot taken.
  * Leaves the stack intact, so that "Redo" can still be used.
  */
  rewind(): void {
    // Create snap shot if not yet recorded
    if (this.editable.innerHTML !== this.stack[this.stackOffset].contents) {
      this.recordUndo();
    }

    // Return to the first available snapshot.
    this.stackOffset = 0;

    // Apply that snapshot.
    this.applySnapshot(this.stack[this.stackOffset]);
  }

  /**
  *  @method commit
  *  Resets history stack, but keeps current editor's content.
  */
  commit(): void {
    // Clear the stack.
    this.stack = [];

    // Restore stackOffset to its original value.
    this.stackOffset = -1;

    // Record our first snapshot (of nothing).
    this.recordUndo();
  }

  /**
  * @method reset
  * Resets the history stack completely; reverting to an empty editor.
  */
  reset(): void {
    // Clear the stack.
    this.stack = [];

    // Restore stackOffset to its original value.
    this.stackOffset = -1;

    // Clear the editable area.
    this.editable.innerHTML = '';

    // Record our first snapshot (of nothing).
    this.recordUndo();
  }

  /**
   * undo
   */
  undo(): void {
    // Create snap shot if not yet recorded
    if (this.editable.innerHTML !== this.stack[this.stackOffset].contents) {
      this.recordUndo();
    }

    if (this.stackOffset > 0) {
      this.stackOffset--;
      this.applySnapshot(this.stack[this.stackOffset]);
    }
  }

  /**
   * redo
   */
  redo(): void {
    if (this.stack.length - 1 > this.stackOffset) {
      this.stackOffset++;
      this.applySnapshot(this.stack[this.stackOffset]);
    }
  }

  canUndo(): boolean {
    return this.stackOffset > 0;
  }

  canRedo(): boolean {
    return this.stack.length - 1 > this.stackOffset;
  }

  /**
   * recorded undo
   */
  recordUndo(): void {
    this.stackOffset++;

    // Wash out stack after stackOffset
    if (this.stack.length > this.stackOffset) {
      this.stack = this.stack.slice(0, this.stackOffset);
    }

    // Create new snapshot and push it to the end
    this.stack.push(this.makeSnapshot());

    // If the stack size reachs to the limit, then slice it
    if (this.stack.length > this.options.historyLimit) {
      this.stack.shift();
      this.stackOffset -= 1;
    }
  }
}
