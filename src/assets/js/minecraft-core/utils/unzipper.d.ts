import type { ZipEntry } from '../types.js';
export default class Unzipper {
    private entries;
    constructor(zipFilePath: string);
    getEntries(): ZipEntry[];
}
