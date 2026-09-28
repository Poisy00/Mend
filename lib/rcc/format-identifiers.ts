export function formatAccount(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  return [digits.slice(0, 5), digits.slice(5, 11), digits.slice(11)].filter(Boolean).join("-");
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join("-");
}
