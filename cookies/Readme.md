```
# nest-cookies-engine

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="NestJS Logo" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/nest-cookies-engine">
    <img src="https://img.shields.io/npm/v/nest-cookies-engine?style=flat-square&color=crimson" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/nest-cookies-engine">
    <img src="https://img.shields.io/npm/dm/nest-cookies-engine?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/your-org/nest-cookies/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/your-org/nest-cookies/ci.yml?style=flat-square" alt="CI" />
  </a>
  <a href="https://github.com/your-org/nest-cookies/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/your-org/nest-cookies?style=flat-square" alt="License" />
  </a>
</p>

**High-performance, type-safe, engine-agnostic cookie management for NestJS**

Works seamlessly with **Express** and **Fastify**
Native support for **GraphQL** resolvers
Static & dynamic cookie operations
Strict mode prevents security leaks & forgotten decorators
Signed cookies reading & clearing

## Features

- Engine independent (Express ↔ Fastify)
- Full GraphQL compatibility (`@Cookies` / `@SignedCookie` in resolvers)
- Static decorators (simple & declarative)
- Dynamic mode (conditional / role-based / business-logic cookies)
- Strict contract validation (`strict: true` → 500 if missing gate decorator)
- Signed cookie extraction & bulk clearing
- `secure: 'auto'` based on request protocol / `x-forwarded-proto`
- Global defaults + per-cookie overrides
- `isBind` debug mode (mirrors cookie operations in response body -- values hidden)

## Installation

```bash
npm install nest-cookies-engine
```

**Choose your engine** (only one needed):

Bash

```
# Express
npm install cookie-parser @types/cookie-parser --save-dev

# Fastify
npm install @fastify/cookie
```

Setup
-----

### 1\. Register the module (preferably globally)

TypeScript

```
// app.module.ts
import { Module } from '@nestjs/common';
import { CookiesModule } from 'nest-cookies-engine';

@Module({
  imports: [
    CookiesModule.register({
      strict: true,                    // throw 500 if returning cookies without gate decorator
      debug: process.env.NODE_ENV !== 'production',
      exposeCookieValues: false,       // hide real values when isBind: true
      setCookies: {
        options: {                     // global defaults
          httpOnly: true,
          path: '/',
          sameSite: 'lax',
          secure: 'auto',
        },
      },
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### 2\. Engine-specific cookie middleware (main.ts)

**Express**

TypeScript

```
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser('your-strong-secret-key')); // enables signing
  await app.listen(3000);
}
bootstrap();
```

**Fastify**

TypeScript

```
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule);
  await app.register(fastifyCookie, {
    secret: 'your-strong-secret-key',
  });
  await app.listen(3000);
}
bootstrap();
```

### 3\. GraphQL context setup (required for param decorators)

TypeScript

```
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
  sortSchema: true,
  playground: true,
  context: ({ req, res }) => ({ req, res }), // ← must expose req & res
}),
```

Decorators Reference
--------------------

### Reading Cookies (Parameter Decorators)

| Decorator | Returns | Description |
| --- | --- | --- |
| @Cookies() | Record<string, string> | All unsigned cookies |
| @Cookies('theme') | string | undefined | Single unsigned cookie |
| @Cookies('theme','lang') | Record<string, string | undefined> | Multiple specific unsigned cookies |
| @SignedCookie() | Record<string, string> | All verified signed cookies |
| @SignedCookie('role') | string | undefined | Single signed cookie |
| @SignedCookie('is_admin','plan') | Record<string, string | undefined> | Multiple specific signed cookies |

### Writing & Clearing Cookies (Method Decorators)

| Decorator | Style | Description | Requires Gate? |
| --- | --- | --- | --- |
| @SetCookies('key', value, opts?) | Static | Set one fixed cookie | No |
| @SetCookies({ httpOnly: true, ... }) | Static | Set global defaults for dynamic cookies | No |
| @SetCookies() | Gate | Allow returning cookies.SetCookies in response body | --- |
| @ClearCookies('key') | Static | Clear one specific cookie | No |
| @ClearCookies({ removeAll: true }) | Static | Clear **all** cookies (add signedCookies: true to target only signed) | No |
| @ClearCookies() | Gate | Allow returning cookies.ClearCookies in response body | --- |

Usage Examples
--------------

### 1\. Static -- Theme & Preferences

TypeScript

```
@Get('dark')
@SetCookies('theme', 'dark', { maxAge: 2592000, secure: 'auto' })
setDarkTheme() {
  return { success: true };
}

@Get('clear-theme')
@ClearCookies('theme')
clearTheme() {
  return { message: 'Theme preference removed' };
}
```

### 2\. Static -- Full / Signed-only Cleanup

TypeScript

```
@Get('logout-full')
@ClearCookies({ removeAll: true })
logoutEverything() {
  return { message: 'All cookies cleared' };
}

@Get('security-cleanup')
@ClearCookies({ removeAll: true, signedCookies: true })
clearOnlySigned() {
  return { message: 'All signed cookies removed (security cleanup)' };
}
```

### 3\. Dynamic -- Login / Auth Flow (most common pattern)

TypeScript

```
@Post('login')
@SetCookies()
@ClearCookies()
async login(@Body() dto: LoginDto) {
  const { accessToken, user } = await this.authService.signIn(dto);

  return {
    user: { id: user.id, email: user.email, role: user.role },
    cookies: {
      SetCookies: [
        {
          name: 'access_token',
          value: accessToken,
          options: {
            httpOnly: true,
            secure: 'auto',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
          },
        },
        ...(user.role === 'admin'
          ? [{
              name: 'admin_flag',
              value: 'true',
              options: { httpOnly: false, maxAge: 3600 }
            }]
          : []),
      ],
      ClearCookies: [
        { name: 'temp_guest_id' },
        { name: 'pending_verification' },
      ],
      isBind: true,
    },
  };
}
```

### 4\. Reading Multiple Signed Cookies

TypeScript

```
@Get('dashboard-flags')
getDashboard(
  @SignedCookie('is_admin', 'subscription_plan', 'beta_access')
  flags: Record<string, string | undefined>,
) {
  return {
    isAdmin: flags.is_admin === 'true',
    plan: flags.subscription_plan ?? 'free',
    beta: flags.beta_access === 'enabled',
  };
}
```

### 5\. GraphQL Mutation Example

TypeScript

```
@Mutation(() => AuthResult)
@SetCookies()
async refresh(@Context() ctx: any) {
  const oldRefresh = ctx.req.signedCookies?.refresh_token;
  const newAccess = await this.authService.refresh(oldRefresh);

  return {
    accessToken: newAccess,
    cookies: {
      SetCookies: [{
        name: 'access_token',
        value: newAccess,
        options: { httpOnly: true, secure: 'auto', maxAge: 900 }
      }],
      isBind: true,
    },
  };
}
```

Security & Best Practices
-------------------------

-   Always use httpOnly: true for tokens/sessions
-   Prefer secure: 'auto' (recommended) or secure: process.env.NODE_ENV === 'production'
-   Use sameSite: 'strict' for auth cookies, 'lax' for UX-sensitive ones
-   Keep access tokens short-lived (10--60 min)
-   Use signed cookies (signed: true) for tamper-proof values
-   Enable strict: true in development
-   Use isBind: true for debugging/frontend visibility (values hidden automatically)

Troubleshooting
---------------

-   **Cookies not appearing?** → Check secret is set in cookie-parser / @fastify/cookie
-   **GraphQL decorators return undefined?** → Make sure context: ({ req, res }) => ({ req, res })
-   **500 error in strict mode?** → Add @SetCookies() / @ClearCookies() gate when returning cookies: {...}
-   **Signed cookies empty?** → Ensure secret is the same on read & write

License
-------

MIT © Virtual
