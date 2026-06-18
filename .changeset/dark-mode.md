---
"@eaeao/summernote-react": minor
---

Add dark mode. The new `colorScheme` prop (`'light' | 'dark' | 'auto'`) themes the whole editor — toolbar, dropdowns, dialogs, popovers, and the code view — from CSS variables on the editor root, and `'auto'` follows the OS `prefers-color-scheme`. The lite skin's colors are now CSS variables (`--note-bg`, `--note-text`, `--note-bg-toolbar`, …), so you can also retheme the editor yourself by overriding them. Backward compatible — the default `'light'` is unchanged; bs3/bs4/bs5 follow your app's Bootstrap theme.
