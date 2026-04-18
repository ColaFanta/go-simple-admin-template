# Skill: Add Language

Use this guide when you need to add a new language to the go-i18n setup.

## Goal

Add a new translation file and wire it into the bundle used by the Fiber middleware.

## Read These Files First

- `internal/biz/l10n/bundle.go`
- `internal/biz/l10n/mdw.go`
- `internal/biz/l10n/translation/messages.en.yaml`

## Current Setup

The bundle is created in `internal/biz/l10n/bundle.go` and currently loads:

- `messages.en.yaml`
- `messages.zh.yaml`
- `messages.zh-Hant.yaml`

The request localizer is injected by middleware in `internal/biz/l10n/mdw.go` and stored in Fiber locals.

## Steps

1. Add a new translation file under `internal/biz/l10n/translation`, for example `messages.ja.yaml`.
2. Copy the message IDs from `messages.en.yaml`.
3. Translate the values, but keep the message IDs identical.
4. Register the new file in `internal/biz/l10n/bundle.go` with `bundle.LoadMessageFileFS(...)`.
5. Ensure the desired language tag is supported by the environment or request headers used by the app.
6. Verify one existing page renders the new language correctly.

## Important Constraints

- Message IDs must stay aligned across all language files.
- Do not rename IDs casually; existing templ pages reference them directly.
- Add new IDs to every language file when you add new user-facing text.

## Consumption Pattern

Pages and handlers pull the localizer from Fiber locals and localize message IDs at render time.

That means adding the file alone is not enough. The bundle must load it, and the request must select it.

## Checklist

- New `messages.<lang>.yaml` file exists.
- The file is loaded in `bundle.go`.
- Existing message IDs remain consistent.
- Any newly added keys are added to all supported languages.
- A page was tested with the new locale selected.

## Avoid

- Adding translation keys in only one language file.
- Hardcoding translated strings directly into templ pages.
- Forgetting to register the new translation file in the bundle.