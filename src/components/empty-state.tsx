import { AlertTriangle, Inbox, SearchX, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const icons = {
  empty: Inbox,
  search: SearchX,
  error: AlertTriangle,
  cart: ShoppingBag,
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  variant = "empty",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  variant?: keyof typeof icons;
}) {
  const Icon = icons[variant];
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionHref && actionLabel ? (
        <Button className="mt-5" render={<Link href={actionHref} />}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
