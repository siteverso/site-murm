import { readFile, readFileSync } from 'node:fs';

const entryUrl = new URL('../src/styles/global.css', import.meta.url);
const importPattern = /@import\s+['"]([^'"]+)['"]\s*;/g;

function expandCssSync(url, visited = new Set()) {
  const key = url.href;
  if (visited.has(key)) return '';
  visited.add(key);
  const source = readFileSync(url, 'utf8');
  return source.replace(importPattern, (_, path) => expandCssSync(new URL(path, url), visited));
}

async function expandCss(url, visited = new Set()) {
  const key = url.href;
  if (visited.has(key)) return '';
  visited.add(key);
  const source = await new Promise((resolve, reject) => readFile(url, 'utf8', (error, data) => error ? reject(error) : resolve(data)));
  const matches = [...source.matchAll(importPattern)];
  let result = source;
  for (const match of matches) {
    result = result.replace(match[0], await expandCss(new URL(match[1], url), visited));
  }
  return result;
}

export const readGlobalCss = () => expandCss(entryUrl);
export const readGlobalCssSync = () => expandCssSync(entryUrl);
