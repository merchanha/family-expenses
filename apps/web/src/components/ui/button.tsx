import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-base text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Variants follow DESIGN.md "Buttons & Interactive Controls".
        default: "bg-primary text-primary-foreground hover:bg-primary-container active:scale-[0.99]",
        destructive:
          "border border-negative-border bg-negative-container text-danger-text hover:bg-[#ffe4e6] focus-visible:ring-destructive/20",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border bg-surface-container-lowest text-on-surface shadow-level-1 hover:bg-surface",
        accent:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        ghost:
          "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 pointer-coarse:h-10",
        xs: "h-6 gap-1 rounded-base px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-base px-3 has-[>svg]:px-2.5 pointer-coarse:h-10",
        lg: "h-10 rounded-base px-6 has-[>svg]:px-4",
        // Touch targets ≥ 40px on touch screens (apps/web/CLAUDE.md §17); desktop density unchanged.
        icon: "size-9 pointer-coarse:size-10",
        "icon-xs": "size-6 rounded-base [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 pointer-coarse:size-10",
        "icon-lg": "size-10",
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
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
