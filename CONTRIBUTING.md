# Contributing

Thanks for helping out. Bug reports, ideas and pull requests are welcome.

## Setup

You need Node.js 22 or newer and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm test
pnpm run build
```

Load the `dist/` folder in Chrome through `chrome://extensions` with **Developer mode** on and **Load unpacked**. Reload the extension after each rebuild. `pnpm run dev` rebuilds on change.

## Making a change

1. Open an issue first for anything larger than a small fix, so we can agree on the approach.
2. Branch from `main` and keep the change focused.
3. Add or update tests in `tests/` when behavior changes.
4. Run `pnpm test` and `pnpm run build`; both must pass.
5. Open a pull request and describe what changed and why.

## Ground rules

- The extension uses the Zendrop session already in the browser. Do not add stored tokens, Bearer headers or the `cookies` permission.
- Do not commit credentials, cookies or saved pages from signed-in sessions.

## Reporting bugs

Use the bug report template and include your Chrome version, what you expected and what happened. Please leave out any personal data.
