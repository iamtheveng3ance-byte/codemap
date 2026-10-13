const SOURCE_FILE = /\.(js|jsx|ts|tsx|mts|cts|mjs|cjs)$/i;
const CONFIG_FILE = /(^|\/)(tsconfig|jsconfig)\.json$/i;
const IGNORED_PATH = /(^|\/)(node_modules|\.git|dist|build|coverage)(\/|$)/i;

/** Reads selected source files locally and returns their relative paths and text. */
export async function readFiles(selectedFiles: FileList | File[]): Promise<Record<string, string>> {
  const files = Array.from(selectedFiles);
  const entries = await Promise.all(
    files
      .map((file) => {
        const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
        const path = (relativePath || file.name).replaceAll('\\', '/');
        return { file, path };
      })
      .filter(({ path }) => (SOURCE_FILE.test(path) || CONFIG_FILE.test(path)) && !IGNORED_PATH.test(path))
      .map(async ({ file, path }) => [path, await file.text()] as const),
  );

  return Object.fromEntries(entries);
}
