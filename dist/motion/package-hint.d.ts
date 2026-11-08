import path from 'node:path';
/**
 * The line of a bundle error for package `name`, which `files` (absolute paths) import but do
 * not find installed: the files, relative to the project folder `dir`, and where to install it.
 * `p` is the path flavour (`path.win32` in tests).
 */
export declare function missingPackageLine(name: string, files: string[], dir: string, p?: path.PlatformPath): string;
