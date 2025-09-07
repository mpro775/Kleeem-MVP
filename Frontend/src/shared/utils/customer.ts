export type LiteCustomer = { name?: string; phone?: string; address?: string };
const KEY = "kleem:customer";
export function getLocalCustomer(): LiteCustomer {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveLocalCustomer(c: LiteCustomer) {
  localStorage.setItem(KEY, JSON.stringify(c || {}));
}
