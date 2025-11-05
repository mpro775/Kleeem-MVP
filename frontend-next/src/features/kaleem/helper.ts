export function getKleemSessionId(): string {
    const KEY = "kleem-session-id";
    let s = localStorage.getItem(KEY);
    if (!s) {
      s = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      localStorage.setItem(KEY, s);
    }
    return s;
  }