import { z } from "zod";

import { ENV_DEFAULTS } from "./_defaults";
import { parseEnv, type RuntimeEnvironment } from "../envParser";

const ApiEnvSchema = z.object({
  APP_HOST: z.string().default(ENV_DEFAULTS.appHost),
  APP_PORT: z.coerce.number().default(ENV_DEFAULTS.appPort),
  APP_VERSION: z.string().optional(),
  npm_package_version: z.string().optional(),
  CORS_ORIGINS: z.string().transform((s) =>
    s
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  ),
});

export interface ApiRuntimeConfig {
  readonly host: string;
  readonly port: number;
  readonly appVersion: string;
  readonly corsOrigins: string[];
}

export const readApiRuntimeConfig = (
  env: RuntimeEnvironment = process.env,
): ApiRuntimeConfig => {
  const parsed = parseEnv(ApiEnvSchema, env);
  return {
    host: parsed.APP_HOST,
    port: parsed.APP_PORT,
    appVersion:
      parsed.APP_VERSION ??
      parsed.npm_package_version ??
      ENV_DEFAULTS.appVersion,
    corsOrigins: parsed.CORS_ORIGINS,
  };
};
