// A small "note" cookie the browser keeps about itself, readable by JavaScript.
//
// Some things (is the shopper signed in? do they have items in their bag?) live in hidden login
// and cart cookies that JavaScript can't read, and the shop's pages don't read them either (that is
// what lets the pages be built once and shared). So the browser keeps its own note, and only asks
// the server about those things when the note is there. Visitors without a note make no request.
// The note holds nothing secret: if it is wrong, the server's answer corrects it.
export function createHint(name: string, days: number) {
  const seconds = 60 * 60 * 24 * days;
  return {
    has: () =>
      typeof document !== "undefined" && document.cookie.split("; ").some((c) => c.startsWith(`${name}=`)),
    set: () => {
      document.cookie = `${name}=1; path=/; max-age=${seconds}; samesite=lax`;
    },
    clear: () => {
      document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    },
  };
}
