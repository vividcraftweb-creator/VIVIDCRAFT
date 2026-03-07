import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.02] border border-primary/20",
        destructive:
          "bg-destructive text-white shadow-lg shadow-destructive/15 hover:bg-destructive/90 hover:shadow-xl hover:shadow-destructive/25 hover:scale-[1.02] border border-destructive/20",
        outline:
          "glass-button border-glass-border hover:bg-glass/80 hover:border-glass-border/60",
        secondary:
          "bg-secondary text-secondary-foreground shadow-lg shadow-secondary/10 hover:bg-secondary/90 hover:shadow-xl hover:shadow-secondary/20 hover:scale-[1.02]",
        ghost:
          "hover:bg-glass/50 hover:backdrop-blur-sm hover:border hover:border-glass-border/30",
        link: "text-primary underline-offset-4 hover:underline",
        glass: "glass-button",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        sm: "h-9 px-3 text-xs has-[>svg]:px-2.5",
        lg: "h-12 rounded-xl px-8 text-base has-[>svg]:px-6",
        icon: "size-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
