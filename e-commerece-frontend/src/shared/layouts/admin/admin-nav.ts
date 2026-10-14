import type { IconType } from "react-icons";
import {
  LuArrowLeftRight,
  LuBadgePercent,
  LuCircleHelp,
  LuCoins,
  LuFileText,
  LuFolderTree,
  LuGalleryHorizontal,
  LuInbox,
  LuLayoutDashboard,
  LuLayoutGrid,
  LuListFilter,
  LuMenu,
  LuPackage,
  LuRuler,
  LuSettings,
  LuShoppingBag,
  LuTruck,
  LuUsers,
} from "react-icons/lu";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: IconType;
  // false = screen not built yet; shown greyed out with a "Soon" tag
  ready: boolean;
}

export interface AdminNavGroup {
  title: string | null;
  items: AdminNavItem[];
}

// Plain-language names for a non-technical owner. Flip `ready` to true as each part ships.
export const adminNav: AdminNavGroup[] = [
  {
    title: null,
    items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LuLayoutDashboard, ready: true }],
  },
  {
    title: "Catalog",
    items: [
      { label: "Products", href: "/admin/products", icon: LuPackage, ready: true },
      { label: "Categories", href: "/admin/categories", icon: LuFolderTree, ready: true },
      { label: "Collections", href: "/admin/collections", icon: LuLayoutGrid, ready: true },
      { label: "Filters", href: "/admin/filters", icon: LuListFilter, ready: true },
      { label: "Size guides", href: "/admin/size-guides", icon: LuRuler, ready: true },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: LuShoppingBag, ready: false },
      { label: "Enquiries", href: "/admin/enquiries", icon: LuInbox, ready: true },
      { label: "Customers", href: "/admin/customers", icon: LuUsers, ready: false },
      { label: "Coupons", href: "/admin/coupons", icon: LuBadgePercent, ready: false },
    ],
  },
  {
    title: "Store setup",
    items: [
      { label: "Shipping", href: "/admin/shipping", icon: LuTruck, ready: false },
      { label: "Currencies", href: "/admin/currencies", icon: LuCoins, ready: false },
      { label: "Settings", href: "/admin/settings", icon: LuSettings, ready: true },
    ],
  },
  {
    title: "Website",
    items: [
      { label: "Pages", href: "/admin/pages", icon: LuFileText, ready: true },
      { label: "Menus", href: "/admin/menus", icon: LuMenu, ready: true },
      { label: "Banners", href: "/admin/banners", icon: LuGalleryHorizontal, ready: true },
      { label: "FAQ", href: "/admin/faq", icon: LuCircleHelp, ready: true },
      { label: "Redirects", href: "/admin/redirects", icon: LuArrowLeftRight, ready: true },
    ],
  },
];
