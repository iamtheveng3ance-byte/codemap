# CodeMap

CodeMap ek interactive codebase explorer hai. Apna JavaScript ya TypeScript folder chunein aur dekhein ke files ek doosre ko kaise import karti hain.

## Features

- Folder ke source files se interactive dependency graph.
- Import karne wali aur import hone wali files ki tafseel.
- Demo project, jisse folder select kiye baghair UI explore ki ja sakti hai.
- File search: matching nodes green highlight hotay hain.
- Connected-only filter aur project insights: popular files, top packages aur isolated files.
- JavaScript/TypeScript imports, re-exports, `require()` aur literal dynamic imports ka graph.
- `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`, `.mts` aur `.cts` source files ki support.
- Root `tsconfig.json` ya `jsconfig.json` ke `baseUrl` aur `paths` aliases ki support.
- Folder ki files browser mein locally read hoti hain; server par upload nahi hotin.

## Shuru karne ka tareeqa

Node.js install hone ke baad project directory mein:

```bash
npm install
npm run dev
```

Browser mein terminal par diya gaya local URL kholein. Demo dekhne ke liye **Demo** ya **Explore the demo** dabayein. Apna code map karne ke liye **Choose a folder** dabayein aur project ka root folder chunein taa-ke root TypeScript path aliases bhi mil saken. Folder picker ke liye Chrome ya Edge jaisa Chromium browser istemal karein.

## Analysis ki hudood

- Sirf literal import paths resolve hotay hain; computed `import()`/`require()` paths graph mein nahi aate.
- Path aliases selected folder ke root `tsconfig.json` ya `jsconfig.json` se parhe jaate hain. `extends` chain aur nested package configs abhi follow nahi hotay.
- Import graph static source analysis hai; yeh runtime execution ya package installation check nahi karta.

## Test aur production build

```bash
npm test -- --run
npm run build
```

## Deployment

Yeh Vite static app hai. Kisi bhi static hosting provider par deploy karte waqt build command `npm run build` aur output directory `dist` set karein. Vercel par Git repository import kar ke framework preset **Vite** select karein; default build/output settings istemal ki ja sakti hain. Live demo URL aur screenshot tab add honge jab deployment publish ho jaye.

## Tech stack

React, TypeScript, Vite, React Flow, Dagre, Babel Parser, Vitest aur Lucide.
