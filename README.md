# PlainMote Admin

English | [简体中文](README.zh-CN.md)

Administration console for [PlainMote](https://github.com/xwvike/plainmote). A frontend-only application that queries deployment status and performs administrative operations on users, resources, links and plans through the signed admin API (`/_admin/v1/`).

Hosted instance: <https://xwvike.github.io/plainmote-admin/>

## Design

- **No server component.** Requests are signed in the browser and sent directly to the PlainMote service.
- **The private key does not leave the browser.** It is imported as a non-extractable Ed25519 `CryptoKey` and stored in IndexedDB; the service holds public keys only.
- **Metadata only.** The admin API returns no resource bodies, earlier versions, share addresses or visitor details, and the console provides no means of viewing content.
- **Changes carry a reason.** Every operation with side effects requires a reason, which the service records in its append-only audit log.

API contract: [`docs/admin.md`](https://github.com/xwvike/plainmote/blob/main/docs/admin.md).

## Requirements

- A browser supporting Ed25519 in WebCrypto: Chrome 137, Firefox 129, Safari 17 or later.
- A PlainMote deployment with the admin API enabled.

## Server configuration

| Variable | Description |
| --- | --- |
| `PLAINMOTE_ADMIN_KEYS` | Public keys permitted to sign admin requests, comma-separated. |
| `PLAINMOTE_ADMIN_ORIGINS` | Origins permitted to call the admin API cross-origin from a browser, e.g. `https://xwvike.github.io`. |

Key pairs are generated with `go run ./cmd/plainmote-admin keygen` in the PlainMote repository. The public key is added to `PLAINMOTE_ADMIN_KEYS`; the private key (JWK) is imported into the console and is not placed on the server.

## Environments

An environment pairs a PlainMote service address with its private key. Multiple environments may be stored, and each tab selects its own. Production environments are marked in the interface, and deletions within them require the object name to be entered for confirmation.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test
```

With `PLAINMOTE_ADMIN_TEST_URL` and `PLAINMOTE_ADMIN_TEST_KEY` set, the signing tests also run against a live service. The latter is a JWK file whose public key is listed in that service's `PLAINMOTE_ADMIN_KEYS`.

## Deployment

`npm run build` outputs a static site to `dist/`. `BASE_PATH` sets the deployment path, e.g. `BASE_PATH=/plainmote-admin/`. The application uses browser routing; the server must respond to unknown paths with `index.html`.

The workflow `.github/workflows/pages.yml` runs the tests and the build on every push to `main` and publishes to GitHub Pages (`https://<owner>.github.io/<repository>/`), with a copy of `index.html` as `404.html`.

Key storage is isolated by origin, not by path; every page of the same origin can use the stored keys. Deploy to an origin that serves trusted pages only.

## License

[MIT](LICENSE)
