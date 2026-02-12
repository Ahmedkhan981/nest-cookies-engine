export interface CookieOptions {
  maxAge?: number;
  signed?: boolean;
  expires?: Date;
  httpOnly?: boolean;
  path?: string;
  domain?: string;
  secure?: boolean | "auto"; // 'auto' support added
  encode?: (val: string) => string;
  sameSite?: boolean | "lax" | "strict" | "none";
  priority?: "low" | "medium" | "high";
  partitioned?: boolean;
  parity?: boolean; // Decorator level toggle
  [key: string]: any;
}

export type UniversalCookieOptions = CookieOptions;

export type SetCookiesMetadata =
  | {
      type: "static";
      payload: { name: string; value: string; options: UniversalCookieOptions };
    }
  | {
      type: "global_options";
      payload: UniversalCookieOptions;
    }
  | { type: "empty"; };

export type ClearCookiesMetadata =
  | {
      type: "static";
      payload: {
        removeAll?: boolean; // Updated to boolean
        signedCookies?: boolean;
        name: string;
        options?: UniversalCookieOptions;
      };
    }
  | {
      type: "global_options";
      payload: UniversalCookieOptions & {
        removeAll?: boolean;
        signedCookies?: boolean;
      };
    }
  | { type: "empty" };

export interface CookieInstruction {
  SetCookies?: {
    name: string;
    value: string;
    options?: UniversalCookieOptions;
  }[];
  ClearCookies?: {
    name?: string;
    options?: UniversalCookieOptions & {
      removeAll?: boolean;
      signedCookies?: boolean;
    };
  }[];
  isBind?: boolean;
}

export interface CookieModuleOptions {
  strict?: boolean;
  debug?: boolean;
  exposeCookieValues?: boolean;
  setCookies?: { options?: UniversalCookieOptions };
  clearCookies?: { options?: UniversalCookieOptions };
}
