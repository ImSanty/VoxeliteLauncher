"use strict";
/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const events_1 = require("events");
const Index_js_1 = require("../utils/Index.js");
/** Number of files to hash in parallel during bundle checking */
const CHECK_CONCURRENCY = 64;
/**
 * This class manages checking, downloading, and cleaning up Minecraft files.
 */
class MinecraftBundle extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
    }
    /**
     * Checks each item in the provided bundle to see if it needs to be
     * downloaded or updated (e.g., if hashes don't match).
     *
     * Phase 1 (sync, fast): resolve paths, write CFILE files, quick existence
     * and size checks to immediately classify files as "missing" or "need hash".
     *
     * Phase 2 (parallel): hash files that passed the size check in batches
     * of CHECK_CONCURRENCY to saturate disk I/O without exhausting memory.
     *
     * @param bundle Array of file items describing what needs to be on disk.
     * @returns Array of BundleItem objects that require downloading.
     */
    async checkBundle(bundle) {
        const toDownload = [];
        const toHash = []; // files that exist & need hash verification
        let replaceName = `${this.options.path}/`;
        if (this.options.instance) {
            replaceName = `${this.options.path}/instances/${this.options.instance}/`;
        }
        const ignoredSet = new Set(this.options.ignored);
        // ── Phase 1: synchronous fast-pass ─────────────────────────────
        for (const file of bundle) {
            if (!file.path)
                continue;
            file.path = path_1.default.resolve(this.options.path, file.path).replace(/\\/g, '/');
            file.folder = file.path.split('/').slice(0, -1).join('/');
            if (file.type === 'CFILE') {
                if (!fs_1.default.existsSync(file.folder)) {
                    fs_1.default.mkdirSync(file.folder, { recursive: true, mode: 0o777 });
                }
                fs_1.default.writeFileSync(file.path, file.content ?? '', { encoding: 'utf8', mode: 0o755 });
                continue;
            }
            let stat = null;
            try {
                stat = fs_1.default.statSync(file.path);
            }
            catch { /* does not exist */ }
            if (!stat) {
                toDownload.push(file);
                continue;
            }
            // Skip ignored files
            const relativePath = file.path.replace(replaceName, '');
            if (ignoredSet.has(relativePath))
                continue;
            if (file.sha1) {
                // Quick size check: if size is known and doesn't match → skip hash, redownload
                if (file.size && stat.size !== file.size) {
                    toDownload.push(file);
                }
                else {
                    toHash.push(file);
                }
            }
        }
        // ── Phase 2: parallel hash verification ────────────────────────
        if (toHash.length > 0) {
            let checked = 0;
            const total = toHash.length;
            let idx = 0;
            const worker = async () => {
                while (idx < total) {
                    const file = toHash[idx++];
                    try {
                        const localHash = await (0, Index_js_1.getFileHash)(file.path);
                        if (localHash !== file.sha1) {
                            toDownload.push(file);
                        }
                    }
                    catch {
                        toDownload.push(file);
                    }
                    checked++;
                    this.emit('check', checked, total, 'Checking files');
                }
            };
            const workers = [];
            const concurrency = Math.min(CHECK_CONCURRENCY, toHash.length);
            for (let i = 0; i < concurrency; i++) {
                workers.push(worker());
            }
            await Promise.all(workers);
        }
        return toDownload;
    }
    /**
     * Calculates the total download size of all files in the bundle.
     *
     * @param bundle Array of items in the bundle (with a 'size' field).
     * @returns Sum of all file sizes in bytes.
     */
    async getTotalSize(bundle) {
        let totalSize = 0;
        for (const file of bundle) {
            if (file.size) {
                totalSize += file.size;
            }
        }
        return totalSize;
    }
    /**
     * Removes files or directories that should not be present, i.e., those
     * not listed in the bundle and not in the "ignored" list.
     * If the file is a directory, it's removed recursively.
     *
     * @param bundle Array of BundleItems representing valid files.
     */
    async checkFiles(bundle) {
        // If using instances, ensure the 'instances' directory exists
        let instancePath = '';
        if (this.options.instance) {
            if (!fs_1.default.existsSync(`${this.options.path}/instances`)) {
                fs_1.default.mkdirSync(`${this.options.path}/instances`, { recursive: true });
            }
            instancePath = `/instances/${this.options.instance}`;
        }
        // Gather all existing files in the relevant directory
        const allFiles = this.options.instance
            ? this.getFiles(`${this.options.path}${instancePath}`)
            : this.getFiles(this.options.path);
        // Also gather files from "loader" and "runtime" directories to ignore
        const ignoredFiles = [
            ...this.getFiles(`${this.options.path}/loader`),
            ...this.getFiles(`${this.options.path}/runtime`)
        ];
        // Convert custom ignored paths to actual file paths
        for (let ignoredPath of this.options.ignored) {
            ignoredPath = `${this.options.path}${instancePath}/${ignoredPath}`;
            if (fs_1.default.existsSync(ignoredPath)) {
                if (fs_1.default.statSync(ignoredPath).isDirectory()) {
                    // If it's a directory, add all files within it
                    ignoredFiles.push(...this.getFiles(ignoredPath));
                }
                else {
                    // If it's a single file, just add that file
                    ignoredFiles.push(ignoredPath);
                }
            }
        }
        // Mark bundle paths as ignored (so we don't delete them)
        bundle.forEach(file => {
            ignoredFiles.push(file.path);
        });
        // Filter out all ignored files from the main file list
        const filesToDelete = allFiles.filter(file => !ignoredFiles.includes(file));
        // Remove each file or directory
        for (const filePath of filesToDelete) {
            try {
                const stats = fs_1.default.statSync(filePath);
                if (stats.isDirectory()) {
                    fs_1.default.rmSync(filePath, { recursive: true });
                }
                else {
                    fs_1.default.unlinkSync(filePath);
                    // Clean up empty folders going upward until we hit the main path
                    let currentDir = path_1.default.dirname(filePath);
                    while (true) {
                        if (currentDir === this.options.path)
                            break;
                        const dirContents = fs_1.default.readdirSync(currentDir);
                        if (dirContents.length === 0) {
                            fs_1.default.rmSync(currentDir);
                        }
                        currentDir = path_1.default.dirname(currentDir);
                    }
                }
            }
            catch {
                // If an error occurs (e.g. file locked or non-existent), skip it
                continue;
            }
        }
    }
    /**
     * Recursively gathers all files in a given directory path.
     * If a directory is empty, it is also added to the returned array.
     *
     * @param dirPath The starting directory path to walk.
     * @param collectedFiles Used internally to store file paths.
     * @returns The array of all file paths (and empty directories) under dirPath.
     */
    getFiles(dirPath, collectedFiles = []) {
        if (fs_1.default.existsSync(dirPath)) {
            const entries = fs_1.default.readdirSync(dirPath);
            // If the directory is empty, store it as a "file" so it can be processed
            if (entries.length === 0) {
                collectedFiles.push(dirPath);
            }
            // Explore each child entry
            for (const entry of entries) {
                const fullPath = `${dirPath}/${entry}`;
                const stats = fs_1.default.statSync(fullPath);
                if (stats.isDirectory()) {
                    this.getFiles(fullPath, collectedFiles);
                }
                else {
                    collectedFiles.push(fullPath);
                }
            }
        }
        return collectedFiles;
    }
}
exports.default = MinecraftBundle;
//# sourceMappingURL=Minecraft-Bundle.js.map