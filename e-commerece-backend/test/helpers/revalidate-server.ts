import { createServer, type Server } from 'node:http';

export interface RevalidateCall {
  secret: string | undefined;
  tags: string[];
}

// Stands in for the Next.js revalidate endpoint and records what it receives.
export async function startRevalidateServer(port = 39555) {
  const calls: RevalidateCall[] = [];
  const server: Server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => (body += chunk.toString()));
    req.on('end', () => {
      const parsed = JSON.parse(body || '{}') as { tags?: string[] };
      calls.push({
        secret: req.headers['x-revalidate-secret'] as string | undefined,
        tags: parsed.tags ?? [],
      });
      res.writeHead(200, { 'content-type': 'application/json' }).end('{"revalidated":true}');
    });
  });
  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));

  return {
    calls,
    // Notifications are fire-and-forget; wait until one with `tag` arrives.
    async waitForTag(tag: string, timeoutMs = 3000): Promise<RevalidateCall> {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        const call = calls.find((c) => c.tags.includes(tag));
        if (call) return call;
        await new Promise((r) => setTimeout(r, 20));
      }
      throw new Error(`No revalidation with tag "${tag}". Got: ${JSON.stringify(calls.map((c) => c.tags))}`);
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
