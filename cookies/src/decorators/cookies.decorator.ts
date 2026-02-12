/* eslint-disable @typescript-eslint/no-require-imports */
import {
  type ExecutionContext,
  createParamDecorator,
  InternalServerErrorException,
} from "@nestjs/common";

/**
 * Define a local interface to satisfy ESLint's unsafe member access rules.
 * This covers both Express and Fastify properties.
 */
interface CookieRequest {
  cookies?: Record<string, string>;
  signedCookies?: Record<string, string>;
  unsignCookie?: (value: string) => { valid: boolean; value: string | null };
}

/**
 * ========================
 * Request resolver (REST + GraphQL)
 * ========================
 */
function getRequestFromContext(
  ctx: ExecutionContext,
): CookieRequest | undefined {
  const type = ctx.getType<"http" | "graphql">();

  if (type === "http") {
    return ctx.switchToHttp().getRequest<CookieRequest>();
  }

  // GraphQL dynamic support
  if (type === "graphql") {
    try {
      // Cast the require to a specific shape to avoid "unsafe member access"
      const { GqlExecutionContext } = require("@nestjs/graphql") as {
        GqlExecutionContext: {
          create: (context: ExecutionContext) => {
            getContext: () => { req: CookieRequest };
          };
        };
      };

      const gqlCtx = GqlExecutionContext.create(ctx);
      return gqlCtx.getContext().req;
    } catch {
      throw new InternalServerErrorException(
        "GraphQL context detected but @nestjs/graphql is missing.",
      );
    }
  }

  return undefined;
}

/**
 * ========================
 * Cookie extractor
 * ========================
 */
function getCookies(req: CookieRequest) {
  const unsigned: Record<string, unknown> = req.cookies ?? {};
  let signed: Record<string, unknown> = {};

  // Express signed cookies
  if (req.signedCookies && Object.keys(req.signedCookies).length > 0) {
    signed = req.signedCookies;
  }

  // Fastify signed cookies
  if (req.unsignCookie && req.cookies) {
    const cookieEntries = Object.entries(req.cookies);
    const validEntries = cookieEntries
      .map(([key, value]): [string, string | null] | null => {
        // req.unsignCookie is guaranteed to exist here due to the if check
        const result = req.unsignCookie!(value);
        return result.valid ? [key, result.value] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null);

    signed = Object.fromEntries(validEntries);
  }

  return { unsigned, signed };
}

/**
 * ========================
 * Param decorator factory
 * ========================
 */
/**
 * ========================
 * Param decorator factory
 * ========================
 */
function createCookieParamDecorator(isSigned: boolean) {
  return (...names: string[]) =>
    createParamDecorator((data: string[], ctx: ExecutionContext) => {
      const req = getRequestFromContext(ctx);
      if (!req) return undefined;

      const { unsigned, signed } = getCookies(req);
      // Use unknown instead of any to satisfy strict rules
      const source = isSigned ? signed : unsigned;

      // 1. If no arguments provided: @Cookies(), return everything
      if (data.length === 0) {
        return source;
      }

      // 2. If exactly one argument provided: @Cookies('theme')
      if (data.length === 1) {
        return source[data[0]];
      }

      // 3. If multiple arguments provided: @Cookies('a', 'b')
      return data.reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = source[key];
        return acc;
      }, {});
    })(names);
}
/**
 * ========================
 * FINAL DECORATORS
 * ========================
 */

/**
 * Retrieves UNSIGNED cookies
 *
 * @example
 * // All cookies
 * @Cookies() cookies: Record<string, string>
 *
 * // Single cookie
 * @Cookies('age') age: number
 *
 * // DI-safe pipe example
 * @Cookies('age') @UsePipes(ParseIntPipe) age: number
 */
export const Cookies = createCookieParamDecorator(false);

/**
 * Retrieves SIGNED cookies
 *
 * @example
 * // All signed cookies
 * @SignedCookie() signedCookies: Record<string, string>
 *
 * // Single signed cookie
 * @SignedCookie('user_id') userId: string
 *
 * // DI-safe pipe example
 * @SignedCookie('user_id') @UsePipes(MyDIPipe) user: UserEntity
 */
export const SignedCookie = createCookieParamDecorator(true);
