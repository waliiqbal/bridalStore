import { createHint } from "@/shared/lib/hint-cookie";

// "This browser probably has a signed-in account" (see shared/lib/hint-cookie.ts)
export const sessionHint = createHint("shopper_hint", 30);
