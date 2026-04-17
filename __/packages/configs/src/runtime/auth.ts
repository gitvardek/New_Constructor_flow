import { z } from "zod";

import { parseEnv, type RuntimeEnvironment } from "../envParser";

const AuthEnvSchema = z.object({
  KEYCLOAK_URL: z.string().url(),
  KEYCLOAK_REALM: z.string(),
  KEYCLOAK_CLIENT_ID: z.string(),
  KEYCLOAK_CLIENT_SECRET: z.string(),
});

export interface AuthRuntimeConfig {
  readonly keycloakUrl: string;
  readonly realm: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly loginUrl: string;
}

export const readAuthRuntimeConfig = (
  env: RuntimeEnvironment = process.env,
): AuthRuntimeConfig => {
  const parsed = parseEnv(AuthEnvSchema, env);
  return {
    keycloakUrl: parsed.KEYCLOAK_URL,
    realm: parsed.KEYCLOAK_REALM,
    clientId: parsed.KEYCLOAK_CLIENT_ID,
    clientSecret: parsed.KEYCLOAK_CLIENT_SECRET,
    loginUrl: `${parsed.KEYCLOAK_URL}/realms/${parsed.KEYCLOAK_REALM}/protocol/openid-connect/auth`,
  };
};
