import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx } from 'clsx';
import { Tag } from '../Icons';

const tagPillVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium transition-colors',
  {
    variants: {
      selected: {
        true: 'bg-rose-500 text-white',
        false: 'bg-slate-700 text-slate-300',
      },
      interactive: {
        true: 'hover:bg-slate-600 cursor-pointer',
        false: 'cursor-default',
      },
      size: {
        md: 'px-3 py-1 text-sm',
        sm: 'px-2 py-0.5 text-xs',
      },
    },
    compoundVariants: [
        // Don't change color on hover if selected and interactive
        { selected: true, interactive: true, className: 'hover:bg-rose-500' }
    ],
    defaultVariants: {
      selected: false,
      size: 'md',
    },
  }
);

export type TagPillProps = React.HTMLAttributes<HTMLButtonElement | HTMLDivElement> &
  VariantProps<typeof tagPillVariants> & {
    tagName: string;
  };

type TagPillElement = HTMLButtonElement | HTMLDivElement;

const TagPill = React.forwardRef<TagPillElement, TagPillProps>(
  ({ className, tagName, selected, size, ...props }, ref) => {
    const isInteractive = !!props.onClick;
    const Component = isInteractive ? 'button' : 'div';
    const buttonProps = isInteractive ? { type: 'button' as const } : {};

    return (
      <Component
        className={clsx(tagPillVariants({ selected, interactive: isInteractive, size, className }))}
        ref={ref as any}
        {...buttonProps}
        {...props}
      >
        <Tag className="h-3 w-3" />
        <span>{tagName}</span>
      </Component>
    );
  }
);
TagPill.displayName = 'TagPill';

export { TagPill };