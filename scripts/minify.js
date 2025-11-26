#!/usr/bin/env node
/**
 * Minification script for production builds
 * Uses esbuild for fast minification of JavaScript files
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import { transform } from 'esbuild';

const DIST_DIR = 'dist';
const CJS_DIR = join(DIST_DIR, 'cjs');

async function getJsFiles(dir) {
  const files = [];
  try {
    const entries = await readdir(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);
      if (stats.isFile() && (extname(entry) === '.js' || extname(entry) === '.cjs')) {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  return files;
}

async function minifyFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const result = await transform(content, {
    minify: true,
    target: 'es2022',
    format: filePath.endsWith('.cjs') ? 'cjs' : 'esm',
    keepNames: true, // Preserve class/function names for debugging
  });
  await writeFile(filePath, result.code);
  return {
    file: filePath,
    before: content.length,
    after: result.code.length,
  };
}

async function main() {
  console.log('🔧 Minifying production build...\n');

  const esmFiles = await getJsFiles(DIST_DIR);
  const cjsFiles = await getJsFiles(CJS_DIR);
  const allFiles = [...esmFiles, ...cjsFiles];

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of allFiles) {
    const result = await minifyFile(file);
    totalBefore += result.before;
    totalAfter += result.after;
    const savings = (((result.before - result.after) / result.before) * 100).toFixed(1);
    console.log(`  ✓ ${result.file}: ${(result.before / 1024).toFixed(1)}KB → ${(result.after / 1024).toFixed(1)}KB (-${savings}%)`);
  }

  console.log('\n📦 Summary:');
  console.log(`  Total before: ${(totalBefore / 1024).toFixed(1)}KB`);
  console.log(`  Total after:  ${(totalAfter / 1024).toFixed(1)}KB`);
  console.log(`  Savings:      ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%\n`);
}

main().catch(console.error);

