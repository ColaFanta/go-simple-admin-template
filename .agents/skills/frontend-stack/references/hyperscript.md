# Hyperscript

The shared script is loaded in `internal/app/ui/layout/base.templ` from hyperscript `0.9.93`.

## Local Rules

- Keep `_` attributes readable and terminate multi-command blocks with `end` when another feature follows.
- Use the current HTMX 4 event names inside hyperscript, such as `on htmx:after:request`.
- Read HTMX 4 request data through `event.detail.ctx`, not the removed `xhr` fields.
- Escape localized strings inserted into JavaScript or hyperscript attribute values for the surrounding quote style.
- Prefer direct DOM references and hyperscript commands over unnecessary JavaScript for local UI interactions.

The upstream language reference is https://hyperscript.org/docs/language/. The runtime is still a pre-1.0 language, so validate behavior in the browser after syntax changes.