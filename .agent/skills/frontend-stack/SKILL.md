---
name: frontend-stack
description: "Use this project's HTMX 4, hyperscript, templui v1, embedded asset, and server-rendered frontend conventions."
user-invocable: false
disable-model-invocation: false
---

# Frontend Stack

Use this skill for browser behavior, templui components, and HTMX or hyperscript changes. Read the closest reference before editing.

## References

- [HTMX 4](./references/htmx4.md)
- [Hyperscript](./references/hyperscript.md)
- [Templui](./references/templui.md)

## Local Rules

- Keep user-facing HTML server-rendered with templ.
- Use HTMX for requests and partial swaps; keep full-page and partial components separate when both are needed.
- Put reusable browser behavior in embedded assets or component scripts rather than duplicating inline JavaScript.
- Verify both source `.templ` files and generated output after frontend changes.