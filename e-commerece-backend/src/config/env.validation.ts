export interface S3Env {
  bucket: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
}

export interface Env {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  FRONTEND_URL: string;
  JWT_SECRET: string;
  ADMIN_SESSION_DAYS: number;
  CUSTOMER_JWT_SECRET: string;
  CUSTOMER_SESSION_DAYS: number;
  // First FRONTEND_URL entry; used to build links in emails
  STOREFRONT_URL: string;
  MAIL_DRIVER: 'console' | 'provider';
  MAIL_FROM: string;
  // Number of trusted reverse proxies in front of the API (for client IPs)
  TRUST_PROXY: number;
  STORAGE_DRIVER: 'local' | 's3';
  UPLOADS_DIR: string;
  UPLOADS_PUBLIC_URL: string;
  S3?: S3Env;
  FRONTEND_REVALIDATE_URL?: string;
  REVALIDATE_SECRET?: string;
}

const NODE_ENVS = ['development', 'production', 'test'] as const;
const MAIL_DRIVERS = ['console', 'provider'] as const;
const STORAGE_DRIVERS = ['local', 's3'] as const;
const isHttpUrl = (v: string) => /^https?:\/\/[^\s]+$/.test(v);
const trimSlash = (v: string) => v.replace(/\/+$/, '');

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

  // ── Customer accounts ──
  const customerSecret = str('CUSTOMER_JWT_SECRET');
  if (customerSecret.length < 32) {
    errors.push(
      'CUSTOMER_JWT_SECRET must be set and at least 32 characters (generate one with: openssl rand -hex 32)',
    );
  } else if (customerSecret === jwtSecret) {
    errors.push('CUSTOMER_JWT_SECRET must be different from JWT_SECRET');
  }
  const customerDays = Number(str('CUSTOMER_SESSION_DAYS') || 30);
  if (!Number.isInteger(customerDays) || customerDays <= 0) {
    errors.push('CUSTOMER_SESSION_DAYS must be a positive integer');
  }

  // ── Email ──
  const mailDriver = str('MAIL_DRIVER') || 'console';
  if (!(MAIL_DRIVERS as readonly string[]).includes(mailDriver)) {
    errors.push(`MAIL_DRIVER must be one of: ${MAIL_DRIVERS.join(', ')}`);
  }
  const mailFrom = str('MAIL_FROM') || 'Malikah Bridal Studio <hello@example.com>';

  const trustProxy = Number(str('TRUST_PROXY') || 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0) {
    errors.push('TRUST_PROXY must be 0 or a positive integer (number of proxies in front of the API)');
  }

  // ── Image storage ──
  const storageDriver = str('STORAGE_DRIVER') || 'local';
  if (!(STORAGE_DRIVERS as readonly string[]).includes(storageDriver)) {
    errors.push(`STORAGE_DRIVER must be one of: ${STORAGE_DRIVERS.join(', ')}`);
  }
  const uploadsPublicUrl = trimSlash(
    str('UPLOADS_PUBLIC_URL') || `http://localhost:${port}/uploads`,
  );
  if (!isHttpUrl(uploadsPublicUrl)) {
    errors.push('UPLOADS_PUBLIC_URL must be an http(s) URL');
  }

  let s3: S3Env | undefined;
  if (storageDriver === 's3') {
    const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_PUBLIC_URL'];
    const missing = required.filter((key) => !str(key));
    if (missing.length) {
      errors.push(`STORAGE_DRIVER=s3 also needs: ${missing.join(', ')}`);
    }
    const endpoint = str('S3_ENDPOINT') || undefined;
    if (endpoint && !isHttpUrl(endpoint)) errors.push('S3_ENDPOINT must be an http(s) URL');
    if (str('S3_PUBLIC_URL') && !isHttpUrl(str('S3_PUBLIC_URL'))) {
      errors.push('S3_PUBLIC_URL must be an http(s) URL');
    }
    s3 = {
      bucket: str('S3_BUCKET'),
      region: str('S3_REGION'),
      endpoint,
      accessKeyId: str('S3_ACCESS_KEY_ID'),
      secretAccessKey: str('S3_SECRET_ACCESS_KEY'),
      publicUrl: trimSlash(str('S3_PUBLIC_URL')),
    };
  }

  // ── Storefront cache revalidation (optional) ──
  const revalidateUrl = str('FRONTEND_REVALIDATE_URL') || undefined;
  const revalidateSecret = str('REVALIDATE_SECRET') || undefined;
  if (revalidateUrl) {
    if (!isHttpUrl(revalidateUrl)) errors.push('FRONTEND_REVALIDATE_URL must be an http(s) URL');
    if (!revalidateSecret || revalidateSecret.length < 32 || /[<>]/.test(revalidateSecret)) {
      errors.push('REVALIDATE_SECRET must be at least 32 characters when FRONTEND_REVALIDATE_URL is set');
    }
  }

  const frontendUrl = str('FRONTEND_URL') || 'http://localhost:3001';

  if (errors.length > 0) {
    throw new Error(
      `Invalid environment configuration (check your .env file):\n  - ${errors.join('\n  - ')}`,
    );
  }

  return {
    NODE_ENV: nodeEnv as Env['NODE_ENV'],
    PORT: port,
    DATABASE_URL: databaseUrl,
    FRONTEND_URL: frontendUrl,
    JWT_SECRET: jwtSecret,
    ADMIN_SESSION_DAYS: sessionDays,
    CUSTOMER_JWT_SECRET: customerSecret,
    CUSTOMER_SESSION_DAYS: customerDays,
    STOREFRONT_URL: trimSlash(frontendUrl.split(',')[0].trim()),
    MAIL_DRIVER: mailDriver as Env['MAIL_DRIVER'],
    MAIL_FROM: mailFrom,
    TRUST_PROXY: trustProxy,
    STORAGE_DRIVER: storageDriver as Env['STORAGE_DRIVER'],
    UPLOADS_DIR: str('UPLOADS_DIR') || 'uploads',
    UPLOADS_PUBLIC_URL: uploadsPublicUrl,
    S3: s3,
    FRONTEND_REVALIDATE_URL: revalidateUrl,
    REVALIDATE_SECRET: revalidateSecret,
  };
}
