export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  JWT_SECRET: string;
  ADMIN_SESSION_DAYS: number;
}

const NODE_ENVS = ['development', 'production', 'test'] as const;

export function validateEnv(raw: Record<string, unknown>): Env {
  const errors: string[] = [];
  const str = (key: string) =>
    typeof raw[key] === 'string' ? (raw[key] as string).trim() : '';

  const databaseUrl = str('DATABASE_URL');
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL must be set to a postgresql:// connection string');
  }

  const jwtSecret = str('JWT_SECRET');
  if (jwtSecret.length < 32) {
    errors.push(
      'JWT_SECRET must be set and at least 32 characters (generate one with: openssl rand -hex 32)',
    );
  }

  const nodeEnv = str('NODE_ENV') || 'development';
  if (!(NODE_ENVS as readonly string[]).includes(nodeEnv)) {
    errors.push(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}`);
  }

  const port = Number(str('PORT') || 3000);
  if (!Number.isInteger(port) || port <= 0) {
    errors.push('PORT must be a positive integer');
  }

  const sessionDays = Number(str('ADMIN_SESSION_DAYS') || 7);
  if (!Number.isInteger(sessionDays) || sessionDays <= 0) {
    errors.push('ADMIN_SESSION_DAYS must be a positive integer');
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration (check your .env file):\n  - ${errors.join('\n  - ')}`,
    );
  }

  return {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: str('FRONTEND_URL') || 'http://localhost:3001',
    JWT_SECRET: jwtSecret,
    ADMIN_SESSION_DAYS: sessionDays,
  };
}
