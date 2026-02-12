import { SetMetadata } from "@nestjs/common";
import type {
  UniversalCookieOptions,
  ClearCookiesMetadata,
  CookieOptions,
} from "../types";
import { CLEAR_COOKIES_METADATA_KEY } from "../constant";

/**
 * Overload 1: Clear a specific cookie by name
 */
export function ClearCookies(
  name: string,
  options?: CookieOptions,
): MethodDecorator;

/**
 * Overload 2: Global clear options or Remove All
 */
export function ClearCookies(
  options: CookieOptions & { removeAll?: boolean; signedCookies?: boolean },
): MethodDecorator;

/**
 * Overload 3: Empty (Uses default settings)
 */
export function ClearCookies(): MethodDecorator;

/**
 * Implementation with Runtime Check
 */
export function ClearCookies(...args: unknown[]): MethodDecorator {
  let metadata: ClearCookiesMetadata;

  if (typeof args[0] === "string") {
    // Case: @ClearCookies('name', options)
    metadata = {
      type: "static",
      payload: {
        name: args[0],
        options: (args[1] as UniversalCookieOptions) || {},
        removeAll: false,
        signedCookies: (args[1] as any)?.signedCookies ?? false,
      },
    };
  } else if (typeof args[0] === "object" && args[0] !== null) {
    // Case: @ClearCookies({ removeAll: true, signedCookies: true })
    const opts = args[0] as any;
    metadata = {
      type: "global_options",
      payload: {
        ...opts,
        removeAll: opts.removeAll ?? false,
        signedCookies: opts.signedCookies ?? false,
      },
    };
  } else {
    metadata = { type: "empty" };
  }

  return SetMetadata(CLEAR_COOKIES_METADATA_KEY, metadata);
}
