# Changesets

This folder configures [changesets](https://github.com/changesets/changesets) for release
management of `@eaeao/summernote-core` and `@eaeao/summernote-react` (kept in lockstep
via `fixed`).

The CLI is declared in the root `devDependencies` — run `yarn install` once, then:

```bash
yarn changeset            # describe a change (pick packages + bump type)
yarn changeset version    # consume changesets -> bump versions + CHANGELOG
yarn changeset publish    # build + npm publish (needs `npm login`)
```

The initial `1.0.0` was set directly (the first release); subsequent releases flow through
changesets.
