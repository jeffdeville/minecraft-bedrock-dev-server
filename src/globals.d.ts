// BDS exposes a trimmed-down `console` to behavior pack scripts. It is not the
// browser or Node one, so it is not in any @types package -- declare it here.
//
// Only `warn` and `error` reliably reach the server log (and therefore the web
// log viewer). `log` is dropped unless content logging is enabled, so prefer
// console.warn for anything you actually want to see.
declare const console: {
  log(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(...data: unknown[]): void;
};
