import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-zinc-900 text-white shadow hover:bg-zinc-800",
        secondary: "bg-white border-2 border-zinc-900 text-zinc-900 hover:bg-zinc-900 hover:text-white",
        lime: "bg-lime-400 text-zinc-900 hover:bg-lime-500",
        destructive: "bg-red-500 text-white shadow-sm hover:bg-red-600",
        outline: "border border-zinc-300 bg-white hover:bg-zinc-100",
        ghost: "hover:bg-zinc-100",
        link: "text-zinc-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-8",
        lg: "h-14 px-10 text-lg",
        sm: "h-10 px-6 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
