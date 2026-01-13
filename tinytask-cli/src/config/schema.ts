import { z } from 'zod';

export const ProfileSchema = z.object({
  url: z.string().url(),
  defaultAgent: z.string().optional(),
});

export const ConfigSchema = z.object({
  url: z.string().url().optional(),
  defaultAgent: z.string().optional(),
  outputFormat: z.enum(['table', 'json', 'csv', 'compact']).default('table'),
  colorOutput: z.boolean().default(true),
  timeout: z.number().default(30000),
  profiles: z.record(ProfileSchema).optional(),
  activeProfile: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;
export type Profile = z.infer<typeof ProfileSchema>;

export const DEFAULT_CONFIG: Config = {
  outputFormat: 'table',
  colorOutput: true,
  timeout: 30000,
};
