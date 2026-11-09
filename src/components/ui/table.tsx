import type { ComponentProps } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeButton } from "@/components/design-system/native-controls";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <table
      className={cn("w-full text-start text-[length:var(--control-text)]", className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead className={cn("bg-muted text-muted-foreground", className)} {...props} />
  );
}

export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border", className)} {...props} />;
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th scope="col" className={cn("p-3 text-start font-medium", className)} {...props} />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("p-3 text-start", className)} {...props} />;
}

export function TableRowButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <NativeButton
      type="button"
      className={cn("block min-h-(--control-height-lg) w-full min-w-0 rounded-xl border border-border p-4 text-start text-[length:var(--control-text)] [overflow-wrap:anywhere] hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", className)}
      {...props}
    />
  );
}

const sortIcons = {
  ascending: ArrowUp,
  descending: ArrowDown,
};

export function TableSortButton({
  direction,
  children,
  className,
  ...props
}: Omit<ComponentProps<typeof Button>, "asChild" | "size" | "type" | "variant"> & {
  direction?: keyof typeof sortIcons;
}) {
  const Icon = direction ? sortIcons[direction] : ArrowUpDown;
  return (
    <Button
      {...props}
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-auto min-h-(--control-height-sm) max-w-full justify-start whitespace-normal px-1 text-start text-inherit",
        className,
      )}
    >
      {children}
      <Icon className="size-3.5 shrink-0" aria-hidden />
    </Button>
  );
}
