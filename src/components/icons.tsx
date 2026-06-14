import {
  Wallet,
  ShoppingCart,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Plug,
  Lightbulb,
  Repeat,
  CreditCard,
  Banknote,
  PiggyBank,
  TrendingUp,
  ArrowLeftRight,
  Receipt,
  Landmark,
  HeartPulse,
  Stethoscope,
  Plane,
  Film,
  Gift,
  Gamepad2,
  GraduationCap,
  Briefcase,
  Laptop,
  Phone,
  Sparkles,
  Heart,
  PawPrint,
  Fuel,
  Coffee,
  Baby,
  Dumbbell,
  CircleHelp,
  Tag,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";
import { type IconKey, resolveIconKey } from "@/lib/icons";

export const ICON_MAP: Record<IconKey, LucideIcon> = {
  wallet: Wallet,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  utensils: Utensils,
  car: Car,
  home: Home,
  plug: Plug,
  lightbulb: Lightbulb,
  repeat: Repeat,
  "credit-card": CreditCard,
  banknote: Banknote,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
  arrows: ArrowLeftRight,
  receipt: Receipt,
  landmark: Landmark,
  "heart-pulse": HeartPulse,
  stethoscope: Stethoscope,
  plane: Plane,
  film: Film,
  gift: Gift,
  gamepad: Gamepad2,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  laptop: Laptop,
  phone: Phone,
  sparkles: Sparkles,
  heart: Heart,
  paw: PawPrint,
  fuel: Fuel,
  coffee: Coffee,
  baby: Baby,
  dumbbell: Dumbbell,
  "circle-help": CircleHelp,
  tag: Tag,
};

export function IconByKey({
  iconKey,
  className,
}: {
  iconKey: IconKey;
  className?: string;
}) {
  const Cmp = ICON_MAP[iconKey] ?? Tag;
  return <Cmp className={className} />;
}

/** A colored round chip showing a category's icon. */
export function CategoryIcon({
  category,
  size = "md",
}: {
  category: { name: string; color: string; icon?: string | null } | null;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-10 w-10";
  const isz = size === "sm" ? 16 : size === "lg" ? 22 : 18;

  if (!category) {
    return (
      <span
        className={`flex ${dims} items-center justify-center rounded-full bg-slate-100 text-slate-400`}
      >
        <CircleHelp size={isz} />
      </span>
    );
  }
  const key = resolveIconKey(category.icon, category.name);
  const color = category.color || "#64748b";
  const Cmp = ICON_MAP[key] ?? Tag;
  return (
    <span
      className={`flex ${dims} items-center justify-center rounded-full`}
      style={{ backgroundColor: color + "1f", color }}
    >
      <Cmp size={isz} />
    </span>
  );
}

/** Inline category icon component sized via props (used in chips). */
export function CategoryGlyph({ category }: { category: Category }) {
  const key = resolveIconKey(category.icon, category.name);
  const Cmp = ICON_MAP[key] ?? Tag;
  return <Cmp size={16} style={{ color: category.color }} />;
}
