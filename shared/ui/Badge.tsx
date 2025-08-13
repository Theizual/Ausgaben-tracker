import React, { FC } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      color: {
        amber: 'border-transparent bg-amber-500/20 text-amber-300',
        blue: 'border-transparent bg-blue-500/20 text-blue-300',
        green: 'border-transparent bg-green-500/20 text-green-300',
      },
    },
    defaultVariants: {
      color: 'amber',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge: FC<BadgeProps> = ({ className, color, ...props }) => {
  return (
    <div className={clsx(badgeVariants({ color }), className)} {...props} />
  );
}

export { Badge };
