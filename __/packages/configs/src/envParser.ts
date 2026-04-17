import { z } from 'zod'

export interface RuntimeEnvironment {
  readonly [key: string]: string | undefined
}

export const parseEnv = <S extends z.ZodTypeAny>(
  schema: S,
  env: RuntimeEnvironment
): z.output<S> => {
  const result = schema.safeParse(env)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return result.data as z.output<S>
}
