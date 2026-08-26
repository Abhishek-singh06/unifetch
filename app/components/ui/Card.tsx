import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  hover = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      className={cn("card", hover && "card-hover", className)}
      {...props}
    >
      {children}
    </div>
  );
}
