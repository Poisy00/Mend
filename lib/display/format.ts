import { formatAccount } from "@/lib/rcc/format-identifiers";

export { formatAccount, formatPhone } from "@/lib/rcc/format-identifiers";

export function displayName(value: string): string {
  const text = value.trim();
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length <= 3 || text !== text.toUpperCase()) return text;
  return text.toLowerCase().replace(/(^|[\s\-'])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function formatAccountIfComplete(value: string): string {
  const count = value.replace(/\D/g, "").length;
  return count >= 11 && count <= 13 ? formatAccount(value) : value;
}
