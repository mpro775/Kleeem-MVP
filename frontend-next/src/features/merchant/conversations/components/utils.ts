// Utility functions for conversations
export function linkify(text: string) {
  const urlRe = /((https?:\/\/|www\.)[^\s]+)/gi;
  return text.replace(urlRe, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

export function copyToClipboard(s: string) {
  try {
    navigator.clipboard?.writeText(s);
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = s;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
    } catch {
      // Ignore
    }
    document.body.removeChild(textArea);
  }
}

