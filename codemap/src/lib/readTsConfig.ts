import { normalizePath, type ImportAliases } from './resolveImport';

function stripJsonComments(source: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    const next = source[index + 1];

    if (inString) {
      output += current;
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === '"') inString = false;
      continue;
    }

    if (current === '"') {
      inString = true;
      output += current;
    } else if (current === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1;
      output += '\n';
    } else if (current === '/' && next === '*') {
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') output += '\n';
        index += 1;
      }
      index += 1;
    } else {
      output += current;
    }
  }

  return output;
}

function removeTrailingCommas(source: string): string {
  let output = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < source.length; index += 1) {
    const current = source[index];
    if (inString) {
      output += current;
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === '"') inString = false;
      continue;
    }

    if (current === '"') {
      inString = true;
      output += current;
    } else if (current === ',') {
      let next = index + 1;
      while (/\s/.test(source[next] ?? '')) next += 1;
      if (source[next] !== '}' && source[next] !== ']') output += current;
    } else {
      output += current;
    }
  }

  return output;
}

/** Reads root-level TypeScript/JavaScript path mappings without evaluating project code. */
export function readTsConfigAliases(files: Record<string, string>): ImportAliases {
  const configText = files['tsconfig.json'] ?? files['jsconfig.json'];
  if (!configText) return {};

  try {
    const config = JSON.parse(removeTrailingCommas(stripJsonComments(configText))) as {
      compilerOptions?: {
        baseUrl?: string;
        paths?: Record<string, string | string[]>;
      };
    };
    const compilerOptions = config.compilerOptions;
    if (!compilerOptions) return {};

    const baseUrl = normalizePath(compilerOptions.baseUrl ?? '.');
    const paths = Object.fromEntries(
      Object.entries(compilerOptions.paths ?? {}).map(([pattern, replacements]) => [
        pattern,
        (Array.isArray(replacements) ? replacements : [replacements]).map((replacement) =>
          normalizePath(`${baseUrl}/${replacement}`),
        ),
      ]),
    );

    return { baseUrl, paths };
  } catch {
    return {};
  }
}