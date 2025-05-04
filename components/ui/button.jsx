import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        black: "bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90",
        red: "bg-[#c72c41] text-white hover:bg-[#c72c41]/90 dark:bg-[#c72c41] dark:text-white dark:hover:bg-[#c72c41]/90",
        orange: "bg-[#d76d2b] text-white hover:bg-[#d76d2b]/90 dark:bg-[#d76d2b] dark:text-white dark:hover:bg-[#d76d2b]/90",
        green: "bg-[#008000] text-white hover:bg-[#008000]/90 dark:bg-[#008000] dark:text-white dark:hover:bg-[#008000]/90",
        blue: "bg-[#3b6dbf] text-white hover:bg-[#3b6dbf]/90 dark:bg-[#3b6dbf] dark:text-white dark:hover:bg-[#3b6dbf]/90",
        purple: "bg-[#5c4b8a] text-white hover:bg-[#5c4b8a]/90 dark:bg-[#5c4b8a] dark:text-white dark:hover:bg-[#5c4b8a]/90",
        pink: "bg-[#d83c5e] text-white hover:bg-[#d83c5e]/90 dark:bg-[#d83c5e] dark:text-white dark:hover:bg-[#d83c5e]/90",
        white: "bg-white text-black border border-gray-200 hover:bg-gray-50",
        lightGreen: "bg-[#bbf7d0] text-black hover:bg-[#bbf7d0]/90",
        lightYellow: "bg-[#fefcbf] text-black hover:bg-[#fefcbf]/90",
        lightCoral: "bg-[#f08080] text-white hover:bg-[#f08080]/90",
        lightOrange: "bg-[#ffedd5] text-black hover:bg-[#ffedd5]/90",
        peach: "bg-[#ffcccb] text-black hover:bg-[#ffcccb]/90",
        lightCyan: "bg-[#e0ffff] text-black hover:bg-[#e0ffff]/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
