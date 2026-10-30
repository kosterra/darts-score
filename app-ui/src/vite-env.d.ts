/// <reference types="vite/client" />

// the texts of a language, in parts (scripts/vite.split.texts.mjs)
declare module 'virtual:texts/*' {
  const texts: Record<string, string>;
  export default texts;
}
