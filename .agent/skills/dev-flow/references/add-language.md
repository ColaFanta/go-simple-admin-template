# Add A Language

Read `internal/app/module/l10n/bundle.go`, `internal/app/module/l10n/mdw.go`, and the English translation file first.

1. Add `messages.<lang>.yaml` under `internal/app/module/l10n/translation`.
2. Keep message IDs aligned with `messages.en.yaml`.
3. Register the file with `bundle.LoadMessageFileFS(...)`.
4. Confirm the locale tag used by request headers or the language switcher selects it.
5. Verify one existing page with the new locale.

Add new user-facing IDs to every supported language file and do not hardcode translated copy in templates.