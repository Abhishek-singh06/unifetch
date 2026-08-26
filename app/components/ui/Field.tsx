import * as React from "react";
import { cn } from "@/lib/utils";

export const Field = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string }
>(({ className, label, id, ...props }, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <input ref={ref} id={id} className={cn("field", className)} {...props} />
    </div>
  );
});
Field.displayName = "Field";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }
>(({ className, label, id, children, ...props }, ref) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="field-label">
          {label}
        </label>
      )}
      <select ref={ref} id={id} className={cn("field", className)} {...props}>
        {children}
      </select>
    </div>
  );
});
Select.displayName = "Select";
