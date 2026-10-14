import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { env } from "@/config/env";

// The backend POSTs { "tags": [...] } here after every admin change, with the shared secret
// in the x-revalidate-secret header. Each tag marks cached shop data as stale, so the next
// visitor gets fresh pages. Nobody else can call this: no secret, no refresh.
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = env.revalidateSecret;
  const given = request.headers.get("x-revalidate-secret") ?? "";
  if (!expected || !sameSecret(given, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const raw = body && typeof body === "object" && "tags" in body ? (body as { tags: unknown }).tags : [];
  const tags = (Array.isArray(raw) ? raw : [])
    .filter((tag): tag is string => typeof tag === "string" && tag.length > 0 && tag.length <= 256)
    .slice(0, 200);

  for (const tag of tags) revalidateTag(tag, "max");
  return Response.json({ revalidated: tags.length });
}
