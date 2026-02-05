import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUserShortName(user: { name?: string | null, email: string }) {
  if (user.name) {
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1][0]}`
    }
    return user.name
  }
  return user.email.split('@')[0]
}
