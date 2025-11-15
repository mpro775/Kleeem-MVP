// src/features/mechant/Conversations/ui/utils.ts
export function linkify(text: string) {
    const urlRe = /((https?:\/\/|www\.)[^\s]+)/gi;
    return text.replace(urlRe, (url) => {
      const href = url.startsWith("http") ? url : `https://${url}`;
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }
  
  export function copyToClipboard(s: string) {
    try { navigator.clipboard?.writeText(s); } catch {}
  }
  