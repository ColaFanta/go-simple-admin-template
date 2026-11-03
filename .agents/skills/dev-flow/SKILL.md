---
name: dev-flow
description: "Use this project's development workflow for templ, shadcn-templ, GORM DAO generation, routes, translations, and Goose migrations."
user-invocable: false
disable-model-invocation: false
---

# Development Flow

Use this skill for implementation workflow changes. Read the closest reference for the task and validate the smallest affected slice first.

## References

- [Code generation](./references/code-generation.md)
- [Add a database model](./references/add-db-model.md)
- [Add a route](./references/add-route.md)
- [Add a language](./references/add-language.md)
- [Add a templ page](./references/add-templ-page.md)
- [Goose migrations](./references/goose.md)

## General Sequence

1. Read the closest existing module and source-of-truth file.
2. Edit source files only.
3. Run the owning generator.
4. Run a focused test, typecheck, build, or status command.
5. Broaden validation only when the change crosses package boundaries.