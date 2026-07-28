/**
 * Render a content fragment to safe HTML.
 *
 * New articles are authored with TipTap and stored as HTML — pass through
 * directly (the editor already emits a limited, safe tag set). Legacy articles
 * were stored as plain markdown fragments; for those we apply the minimal
 * markdown transform below as a fallback so old posts still render readable.
 */
export function renderContent(text: string): string {
  // Heuristic: if the fragment looks like HTML (contains a tag), treat it as
  // TipTap HTML and pass through.
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  // Legacy markdown fallback (bold, italic, links, headings).
  const html = text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /\[(.*?)\]\((.*?)\)/g,
      '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>',
    );
  if (text.startsWith("### ")) {
    return `<h3 class="text-lg font-bold text-white mt-4 mb-2">${html.slice(4)}</h3>`;
  }
  if (text.startsWith("## ")) {
    return `<h2 class="text-xl font-bold text-white mt-6 mb-2">${html.slice(3)}</h2>`;
  }
  if (text.startsWith("# ")) {
    return `<h1 class="text-2xl font-bold text-white mt-8 mb-4">${html.slice(2)}</h1>`;
  }
  return `<p>${html}</p>`;
}
