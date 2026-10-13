const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

export interface ImportAliases {
  baseUrl?: string;
  paths?: Record<string, string[]>;
}

export function normalizePath(p: string): string {
  const parts: string[] = [];
  for (const seg of p.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function dirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

/**
 * "./utils" ko asli file path mein badalta hai (e.g. "src/utils.ts").
 * npm packages (react, lodash...) ke liye null deta hai.
 */
export function resolveImport(
  fromFile: string,
  specifier: string,
  allFiles: Set<string>,
  aliases: ImportAliases = {},
): string | null {
  const resolveBase = (base: string): string | null => {
    const candidates = [
      base,
      ...EXTENSIONS.map((extension) => base + extension),
      ...EXTENSIONS.map((extension) => `${base}/index${extension}`),
    ];

    // Bundler projects may write "./foo.js" while the source file is foo.ts.
    const withoutJsExt = base.replace(/\.(js|jsx|mjs|cjs)$/, '');
    if (withoutJsExt !== base) {
      candidates.push(withoutJsExt, ...EXTENSIONS.map((extension) => withoutJsExt + extension));
    }

    return candidates.find((candidate) => allFiles.has(candidate)) ?? null;
  };

  if (/^\.\.?(\/|$)/.test(specifier)) {
    return resolveBase(normalizePath(`${dirname(fromFile)}/${specifier}`));
  }

  const matchingPaths = Object.entries(aliases.paths ?? [])
    .map(([pattern, replacements]) => {
      const wildcardIndex = pattern.indexOf('*');
      if (wildcardIndex === -1) {
        return pattern === specifier ? { replacements, wildcard: '', score: Number.MAX_SAFE_INTEGER } : null;
      }

      const prefix = pattern.slice(0, wildcardIndex);
      const suffix = pattern.slice(wildcardIndex + 1);
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) return null;
      const wildcard = specifier.slice(prefix.length, specifier.length - suffix.length || undefined);
      return { replacements, wildcard, score: prefix.length + suffix.length };
    })
    .filter((entry): entry is { replacements: string[]; wildcard: string; score: number } => entry !== null)
    .sort((left, right) => right.score - left.score);

  for (const match of matchingPaths) {
    for (const replacement of match.replacements) {
      const base = normalizePath(`${aliases.baseUrl ?? ''}/${replacement.replace('*', match.wildcard)}`);
      const resolved = resolveBase(base);
      if (resolved) return resolved;
    }
  }

  if (aliases.baseUrl) return resolveBase(normalizePath(`${aliases.baseUrl}/${specifier}`));
  return null;
}