/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { BundleItem, LaunchOptions } from '../types.js';
export type { BundleItem };
/**
 * This class manages checking, downloading, and cleaning up Minecraft files.
 */
export default class MinecraftBundle extends EventEmitter {
    private options;
    constructor(options: LaunchOptions);
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
    checkBundle(bundle: BundleItem[]): Promise<BundleItem[]>;
    /**
     * Calculates the total download size of all files in the bundle.
     *
     * @param bundle Array of items in the bundle (with a 'size' field).
     * @returns Sum of all file sizes in bytes.
     */
    getTotalSize(bundle: BundleItem[]): Promise<number>;
    /**
     * Removes files or directories that should not be present, i.e., those
     * not listed in the bundle and not in the "ignored" list.
     * If the file is a directory, it's removed recursively.
     *
     * @param bundle Array of BundleItems representing valid files.
     */
    checkFiles(bundle: BundleItem[]): Promise<void>;
    /**
     * Recursively gathers all files in a given directory path.
     * If a directory is empty, it is also added to the returned array.
     *
     * @param dirPath The starting directory path to walk.
     * @param collectedFiles Used internally to store file paths.
     * @returns The array of all file paths (and empty directories) under dirPath.
     */
    private getFiles;
}
