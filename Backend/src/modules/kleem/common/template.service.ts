export function renderPrompt(template: string, vars: Record<string, string>) {
  return (template || '').replace(
    /\{([A-Z0-9_]+)\}/g,
    (_, k) => vars[k] ?? `{${k}}`,
  );
}
