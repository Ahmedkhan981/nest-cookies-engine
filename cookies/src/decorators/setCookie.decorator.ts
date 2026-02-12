import { SetMetadata } from '@nestjs/common';
import type {
  UniversalCookieOptions,
  SetCookiesMetadata,
  CookieOptions,
} from '../types';
import { COOKIES_METADATA_KEY } from '../constant';


export function SetCookies(
  name: string,
  value: string,
  options?: CookieOptions,
): MethodDecorator;

// Overload 2: Global Options for the whole method
export function SetCookies(options: CookieOptions): MethodDecorator;

// Overload 3: Empty
export function SetCookies(): MethodDecorator;

// Implementation
export function SetCookies(...args: unknown[]): MethodDecorator {
  let metadata: SetCookiesMetadata;

  if (typeof args[0] === 'string') {
    metadata = {
      type: 'static',
      payload: {
        name: args[0],
        value: args[1] as string,
        options: (args[2] as UniversalCookieOptions) || {},
      },
    };
  } else if (typeof args[0] === 'object' && args[0] !== null) {
    metadata = {
      type: 'global_options',
      payload: args[0] as UniversalCookieOptions,
    };
  } else {
    metadata = { type: 'empty' };
  }

  return SetMetadata(COOKIES_METADATA_KEY, metadata);
}
