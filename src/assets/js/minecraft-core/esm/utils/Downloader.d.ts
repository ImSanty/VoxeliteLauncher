/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { DownloadFile } from '../types.js';
export type { DownloadFile as DownloadOptions };
/**
 * A class responsible for downloading single or multiple files,
 * emitting events for progress, speed, estimated time, and errors.
 */
export default class Downloader extends EventEmitter {
    /**
     * Downloads a single file from the given URL to the specified local path.
     * Emits "progress" events with the number of bytes downloaded and total size.
     *
     * @param url - The remote URL to download from
     * @param dirPath - Local folder path where the file is saved
     * @param fileName - Name of the file (e.g., "mod.jar")
     */
    downloadFile(url: string, dirPath: string, fileName: string): Promise<void>;
    /**
     * Downloads multiple files concurrently using a worker-pool pattern.
     * Small files (< 1 MB) are fetched as a single buffer and written at once,
     * avoiding per-file stream/event overhead. Large files are streamed to disk.
     *
     * Progress events are throttled to avoid flooding the event loop.
     * Directories are pre-created in a single pass before downloading begins.
     *
     * @param files   - Array of DownloadFile describing each file
     * @param size    - Total size (bytes) of all files to download
     * @param limit   - Maximum number of simultaneous downloads
     * @param timeout - Timeout in ms for each fetch request
     */
    downloadFileMultiple(files: DownloadFile[], size: number, limit?: number, timeout?: number): Promise<void>;
    /**
     * Performs a HEAD request on the given URL to check if it is valid (status=200)
     * and retrieves the "content-length" if available.
     *
     * @param url The URL to check
     * @param timeout Time in ms before the request times out
     * @returns An object containing { size, status } or rejects with false
     */
    checkURL(url: string, timeout?: number): Promise<{
        size: number;
        status: number;
    } | false>;
    /**
     * Tries each mirror in turn, constructing an URL (mirror + baseURL). If a valid
     * response is found (status=200), it returns the final URL and size. Otherwise, returns false.
     *
     * @param baseURL The relative path (e.g. "group/id/artifact.jar")
     * @param mirrors An array of possible mirror base URLs
     * @returns An object { url, size, status } if found, or false if all mirrors fail
     */
    checkMirror(baseURL: string, mirrors: string[]): Promise<{
        url: string;
        size: number;
        status: number;
    } | false>;
}
