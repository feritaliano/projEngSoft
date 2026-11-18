/** Text of each text node joined by one space: Angular drops the whitespace between elements. */
export function text(element: Element | null | undefined): string {
  const parts: string[] = [];
  const walker = document.createTreeWalker(element!, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) parts.push(walker.currentNode.textContent!.trim());
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ');
}
