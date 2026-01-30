import * as LucideIcons from "lucide-react";
import { cn } from "../../lib/utils";

const Button = ({
  variant = "default",
  size = "default",
  className,
  children,
  isLoading,
  ...props
}) => {
  const variants = {
    default: "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md",
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md",
    outline:
      "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground dark:hover:bg-secondary dark:hover:text-primary",
    ghost:
      "hover:bg-secondary/50 hover:text-primary dark:hover:bg-secondary/20 dark:hover:text-primary-foreground",
    destructive:
      "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    secondary:
      "bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/80",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    icon: "h-10 w-10",
  };

  return (
    <button
      disabled={isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-all disabled:opacity-50 active:scale-95 cursor-pointer",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <LucideIcons.Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
