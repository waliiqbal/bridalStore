"use client";

import { useState, type ReactNode } from "react";
import { LuBold, LuHeading3, LuItalic, LuLink, LuList, LuListOrdered } from "react-icons/lu";

// A small "Word-like" editor for descriptions. It produces simple HTML
// (bold, italic, headings, lists); the backend cleans it again before saving.
// The initial value is read once; remount with a new `key` to load new content.
export function RichTextField({
  id,
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const [initial] = useState(value);
  const [empty, setEmpty] = useState(!value.trim());

  function exec(command: string, argument?: string) {
    document.execCommand(command, false, argument);
  }

  // Asks for a web address and turns the selected words into a link
  function addLink() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      window.alert("First select the words you want to turn into a link, then press the link button.");
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const address = window.prompt(
      "Where should the link go? Paste a web address (https://…) or a page like /pages/about",
      "https://",
    );
    if (address === null) return;
    // The prompt can drop the selection, so put it back first
    selection.removeAllRanges();
    selection.addRange(range);
    if (address.trim() === "" || address.trim() === "https://") exec("unlink");
    else exec("createLink", address.trim());
  }

  function emit(element: HTMLElement) {
    const isEmpty = (element.textContent ?? "").trim() === "" && !element.querySelector("img");
    setEmpty(isEmpty);
    onChange(isEmpty ? "" : element.innerHTML);
  }

  const tool = (label: string, icon: ReactNode, run: () => void) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      // mousedown (not click) so the text selection isn't lost
      onMouseDown={(event) => {
        event.preventDefault();
        run();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-cream"
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-sm border border-line bg-white focus-within:border-gold">
      <div className="flex flex-wrap gap-1 border-b border-line px-2 py-1.5">
        {tool("Bold", <LuBold className="h-4 w-4" />, () => exec("bold"))}
        {tool("Italic", <LuItalic className="h-4 w-4" />, () => exec("italic"))}
        {tool("Heading", <LuHeading3 className="h-4 w-4" />, () => exec("formatBlock", "h3"))}
        {tool("Bullet list", <LuList className="h-4 w-4" />, () => exec("insertUnorderedList"))}
        {tool("Numbered list", <LuListOrdered className="h-4 w-4" />, () => exec("insertOrderedList"))}
        {tool("Link (select words first)", <LuLink className="h-4 w-4" />, addLink)}
      </div>
      <div className="relative">
        {empty && placeholder && (
          <p className="pointer-events-none absolute left-4 top-3 text-base text-neutral-400">
            {placeholder}
          </p>
        )}
        <div
          id={id}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          style={{ minHeight }}
          onFocus={() => exec("defaultParagraphSeparator", "p")}
          onInput={(event) => emit(event.currentTarget)}
          onPaste={(event) => {
            // Paste as plain text so nothing odd comes in from Word or websites
            event.preventDefault();
            exec("insertText", event.clipboardData.getData("text/plain"));
          }}
          className="max-w-none px-4 py-3 text-base outline-none [&_a]:text-gold [&_a]:underline [&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-bold [&_ol]:ml-6 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:ml-6 [&_ul]:list-disc"
          dangerouslySetInnerHTML={{ __html: initial }}
        />
      </div>
    </div>
  );
}
