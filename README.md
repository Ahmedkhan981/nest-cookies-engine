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
