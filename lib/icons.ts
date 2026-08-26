import {
  Package,
  ShoppingBag,
  FileText,
  ShoppingBasket,
  Gift,
  type LucideIcon,
} from "lucide-react";

// Maps the package category id used across request/carry/request pages to a
// consistent icon. Keeping this in one place means every surface shows the
// same glyph for the same category.
export const categoryIcons: Record<string, { icon: LucideIcon; label: string }> = {
  amazon: { icon: Package, label: "Amazon / Flipkart" },
  food: { icon: ShoppingBag, label: "Swiggy / Zomato" },
  prints: { icon: FileText, label: "Printouts / Books" },
  grocery: { icon: ShoppingBasket, label: "Blinkit / Instamart" },
  other: { icon: Gift, label: "Other Parcel" },
};

export function getCategoryIcon(id: string): LucideIcon {
  return categoryIcons[id]?.icon ?? Package;
}
