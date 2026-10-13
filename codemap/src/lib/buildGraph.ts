import { parseImports } from './parseImports';
import { resolveImport, normalizePath } from './resolveImport';
import { readTsConfigAliases } from './readTsConfig';

export interface GraphNode {
  id: string; // file path
  imports: string[]; // ye file kin files ko import karti hai
  importedBy: string[]; // kaun is file ko import karta hai
  externalDeps: string[]; // npm packages
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

const SOURCE_FILE = /\.(js|jsx|ts|tsx|mts|cts|mjs|cjs)$/i;
const IGNORED = /(^|\/)(node_modules|\.git|dist|build|coverage)(\/|$)/i;

/** files: { "src/a.ts": "...code..." } */
export function buildGraph(rawFiles: Record<string, string>) {
  const normalizedFiles = Object.fromEntries(
    Object.entries(rawFiles).map(([path, code]) => [normalizePath(path), code]),
  );
  const aliases = readTsConfigAliases(normalizedFiles);
  const files: Record<string, string> = {};
  for (const [p, code] of Object.entries(normalizedFiles)) {
    if (SOURCE_FILE.test(p) && !IGNORED.test(p)) files[p] = code;
  }

  const allPaths = new Set(Object.keys(files));
  const nodes = new Map<string, GraphNode>();
  for (const path of allPaths) {
    nodes.set(path, { id: path, imports: [], importedBy: [], externalDeps: [] });
  }

  const edges: GraphEdge[] = [];
  for (const [path, code] of Object.entries(files)) {
    const node = nodes.get(path)!;
    for (const spec of parseImports(code, path)) {
      const target = resolveImport(path, spec, allPaths, aliases);
      if (target && target !== path) {
        if (!node.imports.includes(target)) {
          node.imports.push(target);
          nodes.get(target)!.importedBy.push(path);
          edges.push({ id: `${path}->${target}`, source: path, target });
        }
      } else if (!target && !spec.startsWith('.')) {
        node.externalDeps.push(spec);
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}