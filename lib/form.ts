'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type UseFormProps, type UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';

/**
 * Thin wrapper around `useForm` that wires up Zod validation automatically.
 * Client-only — import only from Client Components.
 *
 * The internal cast bridges Zod v4's type internals with RHF's FieldValues
 * constraint — a known type-system mismatch with no runtime impact.
 *
 * Usage:
 *   const form = useZodForm(mySchema, { defaultValues: { name: '' } });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useZodForm<T extends z.ZodType<any>>(
  schema: T,
  props?: Omit<UseFormProps<z.infer<T>>, 'resolver'>,
): UseFormReturn<z.infer<T>> {
  return useForm<z.infer<T>>({
    ...props,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
  });
}
