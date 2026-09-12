import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(projectRoot, 'dist');
const staticFiles = [
  'index.html',
  'style.css',
  'motion.css',
  'form.css',
  'script.js',
  'form.js'
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await Promise.all(
  staticFiles.map((file) => cp(join(projectRoot, file), join(outputDir, file)))
);

await cp(join(projectRoot, 'assets'), join(outputDir, 'assets'), { recursive: true });

console.log(`Static assets prepared in ${outputDir}`);
