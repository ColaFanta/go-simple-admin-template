# Agent Skills

Use the category skill that owns the change, then read only the closest reference file.

## Categories

- [Coding style](./coding-style/SKILL.md): Go conventions, Opera error handling, do v2 dependency injection, and lo helpers.
- [Development flow](./dev-flow/SKILL.md): code generation, database models, routes, languages, templ pages, and Goose migrations.
- [Project architecture](./project-architecture/SKILL.md): application layers, dependency direction, and request flow.
- [Frontend stack](./frontend-stack/SKILL.md): HTMX 4, hyperscript, templui, and browser asset conventions.

## Selection Rule

For a cross-cutting change, start with the category that owns the behavior and then consult the adjacent category only for its integration boundary.