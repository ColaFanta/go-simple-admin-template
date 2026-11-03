# Go Conventions

## Error Handling

- Use normal `if err != nil` handling when it makes control flow clearer.
- Use Opera for composable fallible flows, required values, and explicit error propagation. Follow nearby patterns such as `opera.Must(...)`, `opera.MaybeEmpty(...)`, `opera.Do(...)`, and `opera.MustPass(...)`.
- Do not use `panic` for request or database errors.
- At HTTP boundaries, return the error so Fiber middleware can translate it into the response.
- Preserve the original error when adding context; use wrapping or `errors.Join` only when it represents the actual failure set.

## Dependency Injection

- Define module constructors as `New(i do.Injector) ...` when the module participates in application wiring.
- Resolve required dependencies with `do.MustInvoke` close to the wiring or service initialization boundary.
- Register long-lived dependencies and Fiber services in the application configuration, not in individual handlers.
- Avoid global mutable service state unless the existing package already defines that lifecycle.

## Helpers And Names

- Prefer `lo.Ternary`, `lo.Map`, `lo.Reduce`, and related helpers for concise collection or conditional operations.
- Use descriptive names; do not introduce one-letter variables outside conventional short scopes.
- Keep imports grouped and run `gofmt` on changed Go files.

## Generated Output

- Edit source files, not `*_templ.go`, DAO files under `internal/app/module/dao/gen`, Swagger output, or other generated artifacts.
- Run the owning generator after source changes and include generated changes only when the repository tracks them.