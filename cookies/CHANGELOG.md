# Changelog

All notable changes to `nest-cookies-engine` will be documented in this file.

## [Unreleased]

## [1.0.0] - 2026-02-11

### Added
* **Initial Release**: Enterprise-grade cookie management for NestJS.
* **Unified API**: `CookiesModule` works seamlessly with Express and Fastify.
* **Decorators**: `@Cookies()`, `@SignedCookie()`, `@SetCookies()`, `@ClearCookies()`.
* **GraphQL Support**: Native integration with Apollo Driver via context binding.
* **Strict Mode**: Contract enforcement preventing unauthenticated cookie settings.
* **Smart Interceptor**: `isBind` functionality to remove cookie data from response bodies automatically.

### Fixed
* Resolved context-switching issues between Express `req/res` and Fastify `raw.req/reply`.

### Security
* Implemented signed cookie support for tamper-proof storage.