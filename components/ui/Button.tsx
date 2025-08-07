import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold ring-offset-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-theme-primary text-white hover:bg-theme-primary-hover',
        secondary: 'bg-theme-secondary text-white hover:bg-theme-secondary-hover',
        destructive: 'bg-theme-destructive text-white hover:bg-theme-destructive-hover',
        'destructive-ghost': 'hover:bg-red-500/20 text-slate-500 hover:text-red-400',
        ghost: 'hover:bg-theme-secondary',
        link: 'text-theme-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 gap-2',
        sm: 'h-9 px-3 py-1.5 gap-2',
        lg: 'h-11 px-8 gap-2',
        icon: 'h-10 w-10',
        'icon-sm': 'h-9 w-9',
        'icon-xs': 'h-8 w-8',
        'icon-auto': 'p-2',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={clsx(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
