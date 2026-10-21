import { createHint } from "@/shared/lib/hint-cookie";

// "This browser probably has items in its bag" (see shared/lib/hint-cookie.ts)
export const cartHint = createHint("cart_hint", 30);
