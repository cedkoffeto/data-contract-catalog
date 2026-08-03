export type CaretPos = { top: number; left: number; height: number };

export function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number): CaretPos {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(textarea);

  const props = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
    "fontStretch", "lineHeight", "letterSpacing", "wordSpacing",
    "textIndent", "textTransform", "direction",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "boxSizing", "whiteSpace", "wordBreak", "overflowWrap",
    "width", "tabSize",
  ] as const;

  for (const p of props) {
    (mirror.style as unknown as Record<string, string>)[p] = (style as unknown as Record<string, string>)[p];
  }

  mirror.style.position = "absolute";
  mirror.style.top = "0";
  mirror.style.left = "0";
  mirror.style.visibility = "hidden";
  mirror.style.height = "auto";
  mirror.style.overflow = "hidden";
  mirror.style.pointerEvents = "none";

  document.body.appendChild(mirror);

  const textBefore = textarea.value.slice(0, position);
  mirror.textContent = textBefore;

  const span = document.createElement("span");
  span.textContent = textarea.value.slice(position) || ".";
  mirror.appendChild(span);

  const rect = span.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const h = span.offsetHeight;

  document.body.removeChild(mirror);

  return {
    top: rect.top - textareaRect.top,
    left: rect.left - textareaRect.left,
    height: h,
  };
}
