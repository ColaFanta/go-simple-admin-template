---
name: coding-style
description: "Apply this project's Go error-handling, dependency-injection, helper-library, naming, and generated-code conventions."
user-invocable: false
disable-model-invocation: false
---

# Coding Style

Use this skill when adding or reviewing Go code. Read [Go conventions](./references/go-conventions.md) before editing a Go package.

## Rules

- Keep handlers, services, and route modules small and explicit.
- Use `github.com/colafanta/go-opera` for fallible pipelines and required-value extraction where the local package already uses it.
- Use `github.com/samber/do/v2` for dependency injection; constructors receive `do.Injector` and required dependencies use `do.MustInvoke` at wiring boundaries.
- Use `github.com/samber/lo` for small collection and conditional helpers when it improves clarity.
- Return errors to the owning boundary. Do not hide operational errors with empty fallbacks.
- Keep `.templ`, model, migration, and other source files authoritative; regenerate generated output instead of editing it by hand.