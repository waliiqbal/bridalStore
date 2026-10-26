// ─────────────────────────────────────────────────────────────────────────────
// THE SHOP'S SECTIONS — edit this list, then run:  npx prisma db seed
//
// Each section becomes a top item in the header menu, in this order.
//
//   kind: 'category'      → a category with the sub-categories in `items`
//                           (products are put into these in admin)
//   kind: 'occasion'      → collections that fill themselves from the product's
//                           "Occasion" filter (e.g. every product tagged Nikah).
//                           Each name in `items` must exist under Occasion in
//                           prisma/seed.ts → ATTRIBUTES.
//   kind: 'new-arrivals'  → every product marked "New arrival" in admin
//   kind: 'sale'          → every product with an original (crossed-out) price
//
// highlight (optional): 'red', 'gold' or 'dark' to colour the menu item.
// Re-running the seed never deletes anything you added in admin. To rebuild the
// header menu from this list, run:  SEED_RESET_MAIN_MENU=true npx prisma db seed
// ─────────────────────────────────────────────────────────────────────────────

export type ShopSection =
  | { name: string; kind: 'category'; items: string[]; highlight?: string }
  | { name: string; kind: 'occasion'; items: string[]; itemSuffix?: string; highlight?: string }
  | { name: string; kind: 'new-arrivals' | 'sale'; highlight?: string };

export const SHOP_SECTIONS: ShopSection[] = [
  {
    name: 'Bridal Wear',
    kind: 'category',
    items: ['Lehengas', 'Sharara', 'Gharara', 'Bridal Sarees'],
  },
  {
    name: 'Wedding & Formals',
    kind: 'occasion',
    items: ['Nikah', 'Mehndi', 'Barat', 'Walima'],
    // Shown as "Nikah Outfits", "Mehndi Outfits", ...
    itemSuffix: 'Outfits',
  },
  {
    name: 'Party Wear',
    kind: 'category',
    items: ['Formal Suits', 'Anarkali Dresses'],
  },
  {
    name: "Women's Wear",
    kind: 'category',
    items: ['Traditional Suits', 'Sarees', 'Maxi Dresses'],
  },
  {
    name: 'Menswear',
    kind: 'category',
    items: ['Sherwanis', 'Kurta Sets', 'Waistcoats'],
  },
  {
    name: "Kids' Wear",
    kind: 'category',
    items: ["Kids' Kurta Sets", 'Festive Outfits', 'Wedding Outfits'],
  },
  { name: 'New Arrivals', kind: 'new-arrivals' },
  { name: 'Sale', kind: 'sale', highlight: 'red' },
];
