# Skill: Add Templ Page

Use this guide when you need to add a page, table view, or form rendered with `templ`.

## Goal

Add a new templ page in the same style as the existing admin feature pages.

## Read These Files First

- `internal/fiber/handler/templ.go`
- `internal/admsvr/router/api/product/product.templ`
- `internal/admsvr/router/api/apicm/admin_layout.templ`

## Source Of Truth

In this repo, the `.templ` file is the source file. The generated `*_templ.go` file is output and should not be edited by hand.

## Steps

1. Add a new `.templ` file in the relevant feature folder.
2. Define one or more templ components for the page, table, form, or layout fragment.
3. If the page belongs inside the admin shell, wrap it with the existing admin layout component.
4. Access request-scoped dependencies through `fiber.Ctx`, especially the i18n localizer.
5. Add or update the corresponding route handler to render the component with `handler.RenderTempl`.
6. Generate templ output.

## Rendering Pattern

`internal/fiber/handler/templ.go` shows the standard flow:

- route handlers call `handler.RenderTempl(component, optionalLayouts...)`
- layout composition is handled by the render helper
- the final HTTP response is served through the templ HTTP handler

## Localization Pattern

Existing pages use the localizer stored in Fiber locals:

```go
t := fiber.Locals[*i18n.Localizer](c, l10n.KeyI18nLocalizer)
```

Then render translated strings with message IDs.

## Full Page And Partial Page Pattern

If the feature needs both:

- a full admin page
- a partial fragment for HTMX swaps

split the templ components accordingly, like the existing product table and table layout pattern.

## Generate Output

Run one of these after editing `.templ` files:

```sh
go tool templ generate
```

Or use the existing VS Code task for templ generation and watch mode.

## Checklist

- Only `.templ` source files were edited.
- The route uses `handler.RenderTempl`.
- The page reads translations from the request localizer when text is user-facing.
- The page uses existing UI components from `internal/admsvr/ui` where possible.
- Generated templ output has been refreshed.

## Avoid

- Editing generated `*_templ.go` files.
- Building HTML strings manually inside handlers.
- Hardcoding user-facing copy when the page already participates in i18n.