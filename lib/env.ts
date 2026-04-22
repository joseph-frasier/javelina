import { z } from 'zod';

const EnvSchema = z.object({
  JAVELINA_TO_INTAKE_API_KEY: z.string().length(64),
  INTAKE_TO_JAVELINA_API_KEY: z.string().length(64),
  INTAKE_APP_URL: z.string().url(),
});

export const env = EnvSchema.parse(process.env);