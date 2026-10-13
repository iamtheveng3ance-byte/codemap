import { describe, it, expect } from 'vitest';
import { parseImports } from './parseImports';
import { resolveImport } from './resolveImport';
import { buildGraph } from './buildGraph';
import { readFiles } from './readFiles';

describe('parseImports', () => {
  it('ES imports aur re-exports pakadta hai', () => {
    const code = `
      import React from 'react';
      import { a } from './a';
      export * from './b';
      export { c } from '../c';
    `;
    expect(parseImports(code, 'x.ts').sort()).toEqual(['../c', './a', './b', 'react']);
  });

  it('require aur dynamic import pakadta hai', () => {
    const code = `const x = require('./x'); const y = await import('./y');`;
    expect(parseImports(code, 'x.js').sort()).toEqual(['./x', './y']);
  });

  it('JSX aur TypeScript wali file parse karta hai', () => {
    const code = `import type { P } from './types'; export const A = () => <div />;`;
    expect(parseImports(code, 'A.tsx')).toEqual(['./types']);
  });

  it('broken code par crash nahi karta', () => {
    expect(() => parseImports('import {{{ from', 'bad.ts')).not.toThrow();
  });
});

describe('resolveImport', () => {
  const files = new Set(['src/a.ts', 'src/utils/index.ts', 'src/ui/Button.tsx']);

  it('extension add karke resolve karta hai', () => {
    expect(resolveImport('src/main.ts', './a', files)).toBe('src/a.ts');
  });
  it('folder ke index file tak jata hai', () => {
    expect(resolveImport('src/main.ts', './utils', files)).toBe('src/utils/index.ts');
  });
  it('../ handle karta hai', () => {
    expect(resolveImport('src/ui/Card.tsx', '../a', files)).toBe('src/a.ts');
  });
  it('./foo.js ko foo.ts se match karta hai', () => {
    expect(resolveImport('src/main.ts', './a.js', files)).toBe('src/a.ts');
  });
  it('.mts aur .cts files resolve karta hai', () => {
    const modernFiles = new Set(['src/modern.mts', 'src/legacy.cts']);
    expect(resolveImport('src/main.ts', './modern', modernFiles)).toBe('src/modern.mts');
    expect(resolveImport('src/main.ts', './legacy', modernFiles)).toBe('src/legacy.cts');
  });
  it('tsconfig wildcard aur exact aliases resolve karta hai', () => {
    const aliases = {
      baseUrl: '.',
      paths: { '@/*': ['src/*'], '@core': ['src/core/index'] },
    };
    const aliasFiles = new Set(['src/ui/Button.tsx', 'src/core/index.ts']);
    expect(resolveImport('src/main.ts', '@/ui/Button', aliasFiles, aliases)).toBe('src/ui/Button.tsx');
    expect(resolveImport('src/main.ts', '@core', aliasFiles, aliases)).toBe('src/core/index.ts');
  });
  it('npm packages par null deta hai', () => {
    expect(resolveImport('src/main.ts', 'react', files)).toBeNull();
  });
});

describe('buildGraph', () => {
  it('nodes aur edges banata hai', () => {
    const g = buildGraph({
      'src/main.ts': `import { a } from './a'; import React from 'react';`,
      'src/a.ts': `export const a = 1;`,
      'node_modules/x/index.js': `module.exports = 1`,
    });
    expect(g.nodes.map((n) => n.id).sort()).toEqual(['src/a.ts', 'src/main.ts']);
    expect(g.edges).toEqual([{ id: 'src/main.ts->src/a.ts', source: 'src/main.ts', target: 'src/a.ts' }]);
    expect(g.nodes.find((n) => n.id === 'src/a.ts')!.importedBy).toEqual(['src/main.ts']);
    expect(g.nodes.find((n) => n.id === 'src/main.ts')!.externalDeps).toEqual(['react']);
  });

  it('JSONC tsconfig aliases use karta hai aur .mts/.cts ko graph mein rakhta hai', () => {
    const g = buildGraph({
      'tsconfig.json': `{
        // Project import shortcuts
        "compilerOptions": {
          "baseUrl": ".",
          "paths": { "@/*": ["src/*"], },
        },
      }`,
      'src/main.mts': `import { Button } from '@/ui/Button';`,
      'src/ui/Button.cts': 'export const Button = 1;',
    });

    expect(g.nodes.map((node) => node.id).sort()).toEqual(['src/main.mts', 'src/ui/Button.cts']);
    expect(g.edges).toEqual([{
      id: 'src/main.mts->src/ui/Button.cts',
      source: 'src/main.mts',
      target: 'src/ui/Button.cts',
    }]);
  });
});

describe('readFiles', () => {
  it('source files aur root config parhta hai, generated/dependency files chhor deta hai', async () => {
    const files = [
      { name: 'main.mts', webkitRelativePath: 'sample/src/main.mts', text: async () => 'export {};' },
      { name: 'tsconfig.json', webkitRelativePath: 'sample/tsconfig.json', text: async () => '{ }' },
      { name: 'vendor.js', webkitRelativePath: 'sample/node_modules/pkg/vendor.js', text: async () => '' },
      { name: 'bundle.js', webkitRelativePath: 'sample/dist/bundle.js', text: async () => '' },
      { name: 'notes.md', webkitRelativePath: 'sample/notes.md', text: async () => '' },
    ] as unknown as File[];

    await expect(readFiles(files)).resolves.toEqual({
      'sample/src/main.mts': 'export {};',
      'sample/tsconfig.json': '{ }',
    });
  });
});