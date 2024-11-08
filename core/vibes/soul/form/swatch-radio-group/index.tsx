import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { BcImage as Image } from '~/components/bc-image';
import * as React from 'react';

import { ErrorMessage } from '@/vibes/soul/form/error-message';
import { Label } from '@/vibes/soul/form/label';

type SwatchOption =
  | {
      type: 'color';
      value: string;
      label: string;
      color: string;
      disabled?: boolean;
    }
  | {
      type: 'image';
      value: string;
      label: string;
      image: { src: string; alt: string };
      disabled?: boolean;
    };

export const SwatchRadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root> & {
    label?: string;
    options: SwatchOption[];
    errors?: string[];
  }
>(({ id, label, options, errors, className, ...rest }, ref) => {
  return (
    <div className={clsx('space-y-2', className)}>
      {label !== undefined && label !== '' && <Label htmlFor={id}>{label}</Label>}
      <RadioGroupPrimitive.Root
        {...rest}
        aria-label={label}
        className="flex flex-wrap gap-1"
        id={id}
        ref={ref}
      >
        {options.map((option) => (
          <RadioGroupPrimitive.Item
            aria-label={option.label}
            className={clsx(
              'group relative box-content h-8 w-8 rounded-full border p-0.5 transition-colors hover:border-contrast-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:hover:border-transparent data-[disabled]:pointer-events-none data-[state=checked]:border-foreground [&:disabled>.disabled-icon]:grid',
              errors && errors.length > 0
                ? 'border-error disabled:border-transparent'
                : 'border-transparent',
            )}
            disabled={option.disabled}
            key={option.value}
            value={option.value}
          >
            {option.type === 'color' ? (
              <span
                className="block size-full rounded-full border border-foreground/10 group-disabled:opacity-20"
                style={{ backgroundColor: option.color }}
              />
            ) : (
              <span className="relative block h-10 w-10 rounded-full border border-foreground/10">
                <Image alt={option.image.alt} height={40} src={option.image.src} width={40} />
              </span>
            )}
            <div className="disabled-icon absolute inset-0 hidden place-content-center text-foreground">
              <X size={16} strokeWidth={1.5} />
            </div>
          </RadioGroupPrimitive.Item>
        ))}
      </RadioGroupPrimitive.Root>
      {errors?.map((error) => <ErrorMessage key={error}>{error}</ErrorMessage>)}
    </div>
  );
});

SwatchRadioGroup.displayName = 'SwatchRadioGroup';