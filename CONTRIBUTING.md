# Contributing

Thanks for contributing to 若水广场.

## Before you start

- Keep changes small and focused.
- Read `README.md` and `AGENTS.md` before making non-trivial changes.
- For user-visible UI work, also read `design.md`.
- Do not commit secrets, private production data, user data, or large runtime media / 3D assets.

## Local development

```bash
pnpm install
pnpm dev:web
```

For API work, run in another terminal:

```bash
pnpm dev:forum-api
```

Before opening a pull request:

```bash
pnpm check
```

## Pull requests

Use a focused branch and explain what changed and how it was verified. Product or schema changes should include the smallest relevant documentation update when needed.

Security-sensitive reports should follow `SECURITY.md` instead of a public issue.

By contributing code to this repository, you agree that your contribution is licensed under the MIT License.
