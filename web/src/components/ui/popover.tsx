import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger

function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={cn(
          "screen-enter z-50 max-h-[var(--radix-popover-content-available-height)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-xl border border-[#d5e3ee] bg-white p-4 text-sm leading-[1.5] text-[#27313a] shadow-[0_12px_32px_rgba(24,60,90,0.16)] outline-none",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
