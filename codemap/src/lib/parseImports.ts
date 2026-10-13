import { parse } from '@babel/parser';

/**
 * Ek file ke code se saare import/require specifiers nikalta hai.
 * Example: "./utils", "react", "../lib/api"
 */
export function parseImports(code: string, filePath = ''): string[] {
  const isPlainTs = /\.(ts|mts|cts)$/.test(filePath);

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      // .ts files mein <T>x casts JSX se clash karte hain, isliye jsx sirf baaki files ke liye
      plugins: isPlainTs ? ['typescript'] : ['jsx', 'typescript'],
      errorRecovery: true,
    });
  } catch {
    return []; // syntax error wali file ko skip karo, app crash na ho
  }

  const found = new Set<string>();

  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    switch (node.type) {
      case 'ImportDeclaration':
      case 'ExportAllDeclaration':
      case 'ExportNamedDeclaration':
        if (node.source?.value) found.add(node.source.value);
        break;
      case 'ImportExpression':
        if (node.source?.type === 'StringLiteral') found.add(node.source.value);
        break;
      case 'CallExpression': {
        const first = node.arguments?.[0];
        const isRequire = node.callee?.type === 'Identifier' && node.callee.name === 'require';
        const isDynamicImport = node.callee?.type === 'Import';
        if ((isRequire || isDynamicImport) && first?.type === 'StringLiteral') {
          found.add(first.value);
        }
        break;
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'loc' || key.endsWith('Comments')) continue;
      visit(node[key]);
    }
  };

  visit(ast.program);
  return [...found];
}