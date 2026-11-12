export function emailError(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? undefined : "Enter a valid email address.";
}

export function passwordError(value: string) {
  if (value.length < 8) return "Use at least 8 characters.";
  if (encodeURIComponent(value).replace(/%[A-F\d]{2}/gi, "x").length > 72) return "Password is too long (maximum 72 bytes).";
  return undefined;
}
