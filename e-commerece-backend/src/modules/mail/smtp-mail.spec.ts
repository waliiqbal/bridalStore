import { createServer, type Server } from 'node:net';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { validateEnv } from '../../config/env.validation.js';
import { SmtpMailService } from './mail.service.js';

// A tiny fake mail server: says yes to everything and keeps the message it was given.
function fakeSmtpServer(): Promise<{ server: Server; port: number; received: () => string }> {
  let data = '';
  const server = createServer((socket) => {
    let inData = false;
    socket.write('220 fake ready\r\n');
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let end: number;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (inData) {
          if (line === '.') {
            inData = false;
            socket.write('250 queued\r\n');
          } else data += line + '\n';
        } else if (/^EHLO|^HELO/i.test(line)) socket.write('250 fake\r\n');
        else if (/^DATA/i.test(line)) {
          inData = true;
          socket.write('354 go ahead\r\n');
        } else if (/^QUIT/i.test(line)) {
          socket.write('221 bye\r\n');
          socket.end();
        } else socket.write('250 ok\r\n');
      }
    });
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: (server.address() as AddressInfo).port, received: () => data }),
    ),
  );
}

describe('SmtpMailService', () => {
  let server: Server | undefined;
  afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

  it('hands the email to the SMTP server', async () => {
    const fake = await fakeSmtpServer();
    server = fake.server;
    const mail = new SmtpMailService('Malikah <hello@example.com>', {
      host: '127.0.0.1',
      port: fake.port,
      secure: false,
    });
    await mail.send({
      to: 'ayesha@example.com',
      subject: 'Order MBS-10001 confirmed',
      text: 'Thank you',
      html: '<p>Thank you</p>',
    });
    const message = fake.received();
    expect(message).toContain('To: ayesha@example.com');
    expect(message).toContain('From: Malikah <hello@example.com>');
    expect(message).toContain('Subject: Order MBS-10001 confirmed');
    expect(message).toContain('Thank you');
  });

  it('reports a server that cannot be reached', async () => {
    const mail = new SmtpMailService('a@example.com', { host: '127.0.0.1', port: 1, secure: false });
    await expect(mail.send({ to: 'b@example.com', subject: 's', text: 't' })).rejects.toThrow();
  });
});

describe('SMTP settings in the environment', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(40),
    CUSTOMER_JWT_SECRET: 'b'.repeat(40),
    FRONTEND_URL: 'http://localhost:3001',
  };

  it('needs a host when MAIL_DRIVER=smtp, and user and password together', () => {
    expect(() => validateEnv({ ...base, MAIL_DRIVER: 'smtp' })).toThrow(/SMTP_HOST/);
    expect(() =>
      validateEnv({ ...base, MAIL_DRIVER: 'smtp', SMTP_HOST: 'smtp.example.com', SMTP_USER: 'me' }),
    ).toThrow(/SMTP_USER and SMTP_PASSWORD/);
  });

  it('reads the settings, with TLS on for port 465', () => {
    const env = validateEnv({
      ...base,
      MAIL_DRIVER: 'smtp',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: '465',
      SMTP_USER: 'me',
      SMTP_PASSWORD: 'secret',
    });
    expect(env.SMTP).toEqual({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      user: 'me',
      password: 'secret',
    });
  });

  it('ignores SMTP settings for the other drivers', () => {
    expect(validateEnv({ ...base }).SMTP).toBeUndefined();
  });
});
