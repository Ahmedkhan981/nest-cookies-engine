import {
  type DynamicModule,
  Module,
  Global,
  type Provider,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CookiesInterceptor } from './interceptors/cookies.interceptor';
import { type CookieModuleOptions } from './types';
import { COOKIE_MODULE_OPTIONS } from './constant';

@Global()
@Module({})
export class CookiesModule {
  static register(options: CookieModuleOptions): DynamicModule {
    const optionsProvider: Provider = {
      provide: COOKIE_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: CookiesModule,
      providers: [
        optionsProvider,
        {
          provide: APP_INTERCEPTOR, // Automatically applies to every route
          useClass: CookiesInterceptor,
        },
      ],
      exports: [optionsProvider],
    };
  }
}
