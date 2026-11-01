# concurso-front

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

This project replaces its workspace TypeScript package with [typescript-native-bridge](https://github.com/johnsoncodehk/typescript-native-bridge). Command-line tools use the bridge automatically. To use it in VS Code after installing dependencies, accept the prompt to use the workspace TypeScript version. If the prompt does not appear, run **TypeScript: Select TypeScript Version** and choose **Use Workspace Version**.

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

## Login API

The login screen sends a `POST` request with `{ "email": "...", "password": "..." }`
to `http://localhost:3000/api/auth/login` by default. To use another endpoint,
set `VITE_AUTH_LOGIN_URL` in a local `.env` file:

```env
VITE_AUTH_LOGIN_URL=http://localhost:3000/api/auth/login
```

The successful response must contain `data.tokenType`, `data.expiresIn`,
`data.token` and `data.user` (`id`, `name`, `email`, `role` and `area`). The
token and user data are kept in `sessionStorage` for the current browser
session. After login, the welcome screen displays the user's name, email, role
and area; the user can sign out from that screen. `src/services/auth.ts` exports
`getAuthorizationHeader()` to build the
authorization value for authenticated API requests, and `logout()` to clear
the local session. Error responses may include a JSON `message` or `error`
field to show a useful message in the form.

For example, pass `getAuthorizationHeader()` as the `Authorization` header of
an authenticated request. The API remains responsible for validating the
token and its expiration.
The frontend checks the JWT `exp` claim before returning a stored session and
while an authenticated page is open. When the token expires, it clears the
session and redirects the user to the login screen.
Backend errors are also shown as prominent, dismissible alerts at the top of
the screen, in addition to contextual inline messages.

## Bancas

After logging in, use **Gerenciar bancas** to open the authenticated CRUD at
`/bancas`. All authenticated profiles can list and view a banca at
`/bancas/:id`; only users whose role is `admin` see or can invoke create, edit
and delete actions. The screen uses `GET /bancas` (response
`{ "data": [...], "meta": { "total": 0 } }`), `GET /bancas/:id` (response
`{ "data": { ... } }`), `POST /bancas`, `PUT /bancas/:id` and
`DELETE /bancas/:id`. The create and update request bodies contain the fields
`name`, `surname`, `phone`, `address` and `active`.

The API base defaults to `http://localhost:3000/api`; set `VITE_API_BASE_URL`
in `.env` to use another base URL. Requests include the logged-in user's
authorization token. The API must also enforce the admin-only restrictions
for create, update and delete; hiding controls in the frontend is not an
authorization boundary.

## Concursos

The authenticated `/concursos` screen lists and searches contests; the
`/concursos/:id` route shows the full details. All authenticated profiles can
consult them, while only `admin` can create, edit or delete. The screen uses
`GET /concursos` (`{ "data": [...], "meta": { "total": 0 } }`),
`GET /concursos/:id` (`{ "data": { ... } }`), `POST /concursos`,
`PUT /concursos/:id` and `DELETE /concursos/:id`. Create and update send the
contest fields shown in the API example, with `knowledges` as an array of
strings and `bancaId` linking to an existing banca. The edital field is sent
as a name or URL string; file uploads require a separate API contract.

The API must enforce the admin-only restrictions for create, update and
delete; frontend role checks are not an authorization boundary.

Authenticated users can follow or unfollow a contest from its list or detail
screen using `POST /concursos/:id/follow` and `DELETE /concursos/:id/follow`.
The "Concursos que estou seguindo" section loads the current user's followed
records from `GET /concursos/followed`, with each record containing a nested
`concurso` and the response including `meta.total`. The follow state is
updated immediately after successful follow/unfollow requests.

Administrators can open **Auditoria** for each contest to view
`createdByEmail`, `editedByEmail`, `createdAt` and `updatedAt`.

## CI/CD and Vercel deployment

The GitHub Actions workflow at `.github/workflows/deploy-vercel.yml` runs unit
tests and a production build on pull requests targeting `main`. After a push
to `main`, it performs the same checks and deploys the prebuilt application to
Vercel production.

Configure these repository Actions secrets before enabling deployment:

- `VERCEL_TOKEN`: a Vercel access token.
- `VERCEL_ORG_ID`: the Vercel team or account ID.
- `VERCEL_PROJECT_ID`: the Vercel project ID for this frontend.

Set `VITE_API_BASE_URL` and `VITE_AUTH_LOGIN_URL` as Production Environment
Variables in the Vercel project settings. The frontend build embeds these
values, so configure them before the first deployment.

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

# When testing on CI, must build the project first
npm run build

# Runs the end-to-end tests
npm run test:e2e
# Runs the tests only on Chromium
npm run test:e2e -- --project=chromium
# Runs the tests of a specific file
npm run test:e2e -- tests/example.spec.ts
# Runs the tests in debug mode
npm run test:e2e -- --debug
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
