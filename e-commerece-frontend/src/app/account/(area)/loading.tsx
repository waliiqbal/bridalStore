import { ListSkeleton } from "@/shared/components/Skeletons";

// Shown inside the account page (the side menu stays) while the orders, addresses or details load
export default function Loading() {
  return <ListSkeleton />;
}
