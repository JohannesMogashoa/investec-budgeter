# Repository Guidelines

This repository contains the TypeScript source for the Phase 2 Google Apps Script integration. Keep this guide updated as application code, tooling, and tests are added.

## Project Structure & Module Organization

Production code lives in `src/`, tests in `tests/`, fixtures in `tests/fixtures/`, and build tooling in `scripts/`. Keep modules focused by feature or responsibility rather than accumulating unrelated utilities in one file. Add a short README section when introducing a new top-level directory.

## Build, Test, and Development Commands

Run commands from the repository root:

- `npm install` — install locked dependencies.
- `npm test` — run the Vitest suite.
- `npm run typecheck` — run strict TypeScript checks.
- `npm run lint` — check style and common defects.
- `npm run build:check` — build and validate the Apps Script bundle.
- `npm run format:check` — verify Prettier formatting.

Prefer reproducible commands that work from the repository root, and commit the relevant lockfile.

## Coding Style & Naming Conventions

Use the formatter and linter selected by the project; do not manually work around their output. Use two spaces for JSON, YAML, and JavaScript/TypeScript unless the adopted tool configuration specifies otherwise. Name files and directories consistently (kebab-case for general modules, PascalCase for UI components, and descriptive test names such as `budget-summary.test.ts`). Keep public functions and configuration keys explicit and avoid unexplained abbreviations.

## Testing Guidelines

Add tests with each behavior change. Keep unit tests close to the code or in the chosen `tests/` directory, and use names that describe the expected behavior. Include regression coverage for bug fixes and run the full suite before opening a pull request. Record any required coverage threshold once a test framework is configured.

## Commit & Pull Request Guidelines

There is no existing Git history to establish a repository-specific convention. Use concise, imperative commit subjects (for example, `Add transaction categorization`) and keep unrelated changes separate. Pull requests should explain the change, mention validation commands and results, link relevant issues, and include screenshots or sample output for user-facing changes.

## Security & Configuration

Never commit credentials, bank data, generated secrets, or local environment files. Use an ignored `.env` file for local configuration and provide safe placeholder values in an example configuration file once configuration is added.
