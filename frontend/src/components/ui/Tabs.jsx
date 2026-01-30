import { cn } from "../../lib/utils";

export const TabsList = ({ className, children }) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className,
    )}
  >
    {children}
  </div>
);

export const TabsTrigger = ({
  value,
  activeValue,
  onClick,
  children,
  className,
}) => (
  <button
    onClick={() => onClick(value)}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
      activeValue === value
        ? "bg-card text-primary font-semibold shadow-sm"
        : "hover:bg-card/40 hover:font-semibold hover:text-primary dark:hover:bg-secondary/50 dark:hover:text-foreground",
      className,
    )}
  >
    {children}
  </button>
);

export const TabsContent = ({ value, activeValue, children, className }) => (
  <div
    className={cn("rounded-lg border border-border bg-card p-6", className)}
    hidden={activeValue !== value}
  >
    {children}
  </div>
);
