import { cn } from "../../lib/utils";

const Badge = ({ variant = "default", className, children }) => {
  const variants = {
    default:
      "border-transparent bg-primary/10 text-primary hover:bg-primary/20",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "text-muted-foreground border-border",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground",
    success: "border-transparent bg-success/20 text-[#5f6e63]",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        variants[variant],
        className,
      )}
    >
      {children}
    </div>
  );
};

export default Badge;
