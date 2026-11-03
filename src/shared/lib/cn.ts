import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Our custom sizes must be declared, or text-label would be mistaken for a colour and removed.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['label'],
      radius: ['btn', 'input', 'card'],
      shadow: ['card', 'pop'],
    },
  },
});

/** Joins class names. When two conflict, the later one wins, so callers can override a default. */
export function cn(...classes: ClassValue[]): string {
  return merge(clsx(classes));
}
