import {
  Injectable,
  type NestInterceptor,
  type ExecutionContext,
  type CallHandler,
  Logger,
  Inject,
  Optional,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

import {
  COOKIES_METADATA_KEY,
  CLEAR_COOKIES_METADATA_KEY,
  COOKIE_MODULE_OPTIONS,
} from "../constant";
import {
  type CookieModuleOptions,
  type CookieInstruction,
  type SetCookiesMetadata,
  type ClearCookiesMetadata,
  type UniversalCookieOptions,
} from "../types";

// --- STRICT INTERNAL INTERFACES ---

interface RequestWithCookies {
  secure?: boolean;
  headers: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string>;
  signedCookies?: Record<string, string>; // [Added] To access signed jar
  method?: string;
}

interface ResponseWithCookies {
  cookie?: (name: string, value: string, opts: UniversalCookieOptions) => void;
  clearCookie?: (name: string, opts: UniversalCookieOptions) => void;
  setCookie?: (
    name: string,
    value: string,
    opts: UniversalCookieOptions,
  ) => void;
}

interface GqlContext {
  req: RequestWithCookies;
  res: ResponseWithCookies;
}

interface GqlExecutionContextStatic {
  create(ctx: ExecutionContext): {
    getContext<T>(): T;
  };
}

interface CookieAwareResult {
  cookies: CookieInstruction;
  [key: string]: unknown;
}
declare const require: any;

@Injectable()
export class CookiesInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CookiesInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(COOKIE_MODULE_OPTIONS)
    private readonly options: CookieModuleOptions = {},
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();

    // Get Static Metadata from Decorators
    const setMeta = this.reflector.get<SetCookiesMetadata | undefined>(
      COOKIES_METADATA_KEY,
      handler,
    );
    const clearMeta = this.reflector.get<ClearCookiesMetadata | undefined>(
      CLEAR_COOKIES_METADATA_KEY,
      handler,
    );

    return next.handle().pipe(
      map((result: unknown) => {
        const isBodyAware = this.isCookieAware(result);
        const hasDecorator = !!setMeta || !!clearMeta;

        // If no decorator AND no cookies in body, do nothing
        if (!isBodyAware && !hasDecorator) return result;

        const { req, res, info } = this.resolveContext(context);

        // Extract body cookies or fallback to empty object if only using decorators
        const cookies: CookieInstruction = isBodyAware ? result.cookies : {};

        // 1. Validate contract and check for violations
        const hasViolation = this.validateDecoratorContract(
          setMeta,
          clearMeta,
          cookies,
          info,
        );

        // 2. If violation occurs and strict is false, return original object immediately
        if (hasViolation && this.options.strict === false) {
          return result;
        }

        // 3. Process SetCookies (Static Decorator + Dynamic Body)
        if (
          setMeta ||
          (Array.isArray(cookies.SetCookies) && cookies.SetCookies.length > 0)
        ) {
          this.processSetCookies(res, req, cookies, setMeta);
        }

        // 4. Process ClearCookies (Static Decorator + Dynamic Body + removeAll)
        if (
          clearMeta ||
          (Array.isArray(cookies.ClearCookies) &&
            cookies.ClearCookies.length > 0)
        ) {
          this.processClearCookies(res, req, cookies, clearMeta);
        }

        // 5. Return the cleaned or bound response if body was aware
        if (isBodyAware) {
          return this.prepareFinalResponse(result, cookies);
        }

        return result;
      }),
    );
  }

  // Returns true if a violation occurred
  private validateDecoratorContract(
    setMeta: SetCookiesMetadata | undefined,
    clearMeta: ClearCookiesMetadata | undefined,
    cookies: CookieInstruction,
    info: string,
  ): boolean {
    const hasSetData = (cookies.SetCookies?.length ?? 0) > 0;
    const hasClearData = (cookies.ClearCookies?.length ?? 0) > 0;

    const errors: string[] = [];
    if (hasSetData && !setMeta) errors.push(`@SetCookies() is missing.`);
    if (hasClearData && !clearMeta) errors.push(`@ClearCookies() is missing.`);

    if (errors.length > 0) {
      const msg = `[${info}] Cookie Violation: ${errors.join(" ")}`;
      if (this.options.strict !== false) {
        throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      this.logger.warn(msg);
      return true; // Violation detected
    }
    return false;
  }

  private processSetCookies(
    res: ResponseWithCookies,
    req: RequestWithCookies,
    bodyCookies: CookieInstruction,
    meta?: SetCookiesMetadata,
  ): void {
    const isSecure = !!(
      req.secure || req.headers["x-forwarded-proto"] === "https"
    );

    if (meta?.type === "static") {
      this.applySingleSet(
        res,
        meta.payload.name,
        meta.payload.value,
        meta.payload.options,
        isSecure,
      );
    }

    bodyCookies.SetCookies?.forEach((c) => {
      const globalOpts = meta?.type === "global_options" ? meta.payload : {};
      const mergedOpts = { ...globalOpts, ...c.options };
      this.applySingleSet(res, c.name, c.value, mergedOpts, isSecure);
    });
  }

  private applySingleSet(
    res: ResponseWithCookies,
    name: string,
    value: string,
    opts: UniversalCookieOptions,
    isSecure: boolean,
  ) {
    const finalOpts = {
      path: "/",
      ...this.options.setCookies?.options,
      ...opts,
    };
    if (finalOpts.secure === "auto") finalOpts.secure = isSecure;

    if (res.setCookie) res.setCookie(name, value, finalOpts);
    else if (res.cookie) res.cookie(name, value, finalOpts);
  }

  private processClearCookies(
    res: ResponseWithCookies,
    req: RequestWithCookies,
    bodyCookies: CookieInstruction,
    meta?: ClearCookiesMetadata,
  ): void {
    const globalClearOpts = meta?.type === "global_options" ? meta.payload : {};

    // Static Decorator Clear
    if (meta?.type === "static") {
      if (meta.payload.removeAll) {
        this.clearAll(
          res,
          req,
          meta.payload.options || globalClearOpts,
          meta.payload.signedCookies, // Pass boolean
        );
      } else {
        this.executeClear(res, meta.payload.name, meta.payload.options);
      }
    } else if (meta?.type === "global_options" && meta.payload.removeAll) {
      this.clearAll(
        res,
        req,
        globalClearOpts,
        meta.payload.signedCookies ?? false, // Pass boolean
      );
    }

    // Dynamic Body Clear
    bodyCookies.ClearCookies?.forEach((c) => {
      const mergedOpts = { ...globalClearOpts, ...c.options };
      const cAny = c as unknown as Record<string, unknown>;

      const removeAll =
        c.options?.removeAll === true || cAny.removeAll === true;
      const signedCookies =
        c.options?.signedCookies === true || cAny.signedCookies === true;

      if (removeAll) {
        this.clearAll(res, req, mergedOpts, signedCookies);
      } else if (c.name) {
        this.executeClear(res, c.name, mergedOpts);
      }
    });
  }

  private clearAll(
    res: ResponseWithCookies,
    req: RequestWithCookies,
    opts: UniversalCookieOptions,
    signedOnly: boolean, // [Added] Strict toggle
  ) {
    // Logic: If signedOnly is true, target ONLY signedCookies.
    // Otherwise target ONLY standard cookies.
    const targetCookies = signedOnly
      ? (req.signedCookies ?? {})
      : (req.cookies ?? {});

    const names = Object.keys(targetCookies);

    if (this.options.debug)
      this.logger.debug(
        `Clearing ${signedOnly ? "SIGNED" : "SIMPLE"} cookies: ${names.join(", ")}`,
      );

    names.forEach((name) => this.executeClear(res, name, opts));
  }

  private executeClear(
    res: ResponseWithCookies,
    name: string,
    opts: UniversalCookieOptions,
  ) {
    const finalOpts = {
      path: "/",
      ...this.options.clearCookies?.options,
      ...opts,
    };
    if (res.clearCookie) res.clearCookie(name, finalOpts);
    else if (res.setCookie) {
      res.setCookie(name, "", { ...finalOpts, expires: new Date(0) });
    }
  }

  private resolveContext(ctx: ExecutionContext): {
    req: RequestWithCookies;
    res: ResponseWithCookies;
    info: string;
  } {
    if (ctx.getType() === ("graphql" as string)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GqlExecutionContext } = require("@nestjs/graphql") as {
        GqlExecutionContext: GqlExecutionContextStatic;
      };
      const gqlCtx = GqlExecutionContext.create(ctx).getContext<GqlContext>();
      return { req: gqlCtx.req, res: gqlCtx.res, info: "GQL" };
    }
    const http = ctx.switchToHttp();
    const req = http.getRequest<RequestWithCookies>();
    return {
      req,
      res: http.getResponse<ResponseWithCookies>(),
      info: `REST:${req.method ?? ""}`,
    };
  }

  private isCookieAware(val: unknown): val is CookieAwareResult {
    return !!val && typeof val === "object" && "cookies" in val;
  }

  private prepareFinalResponse(
    result: CookieAwareResult,
    cookies: CookieInstruction,
  ): unknown {
    const { cookies: _, ...cleanResult } = result;

    if (cookies.isBind) {
      return {
        ...cleanResult,
        cookies: {
          ...cookies,
          SetCookies: cookies.SetCookies?.map((c) => ({
            ...c,
            value: this.options.exposeCookieValues ? c.value : "[HIDDEN]",
          })),
        },
      };
    }

    const keys = Object.keys(cleanResult);
    return keys.length === 1 ? cleanResult[keys[0]] : cleanResult;
  }
}
