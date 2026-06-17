# @eaeao/summernote-react

## 1.0.3

### Patch Changes

- Add npm package metadata (author, homepage, repository, bugs, keywords)

## 1.0.2

### Patch Changes

- Table & popover fixes:

  - **Tab / Shift+Tab** now navigate between table cells (and insert an indent run outside tables) instead of moving focus out of the editor — the `TAB`/`SHIFT+TAB` keymap entries were dead because plain-key shortcuts were never matched.
  - **Table cells** now show visible guide-line borders while editing (the inserted `table table-bordered` had no styling in the lite base CSS).
  - **Contextual popovers** (table / link / image) now float just above their target instead of rendering over it — the table popover no longer covers the caret cell.
