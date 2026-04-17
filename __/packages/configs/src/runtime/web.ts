import { z } from "zod";

import { ENV_DEFAULTS } from "./_defaults";
import { parseEnv, type RuntimeEnvironment } from "../envParser";

const WebEnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  WEB_HOST: z.string().default(ENV_DEFAULTS.webHost),
  WEB_PORT: z.coerce.number().default(ENV_DEFAULTS.webPort),
  APP_PORT: z.coerce.number().default(ENV_DEFAULTS.appPort),
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export interface WebRuntimeConfig {
  readonly host: string;
  readonly port: number;
  readonly apiBaseUrl: string;
}

export const readWebRuntimeConfig = (
  env: RuntimeEnvironment = process.env,
): WebRuntimeConfig => {
  const parsed = parseEnv(WebEnvSchema, env);
  const isProduction = parsed.NODE_ENV === 'production'
  if (isProduction && !parsed.NEXT_PUBLIC_API_BASE_URL) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL is required in production')
  }

  return {
    host: parsed.WEB_HOST,
    port: parsed.WEB_PORT,
    apiBaseUrl:
      parsed.NEXT_PUBLIC_API_BASE_URL ?? `http://localhost:${parsed.APP_PORT}`,
  };
};
