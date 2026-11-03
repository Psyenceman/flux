import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('site', { recursive: true, force: true });
mkdirSync('site/dist/src', { recursive: true });
cpSync('studio', 'site', { recursive: true });
cpSync('dist/src', 'site/dist/src', { recursive: true });
