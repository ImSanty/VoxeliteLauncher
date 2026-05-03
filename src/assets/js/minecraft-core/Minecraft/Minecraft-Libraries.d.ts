/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import type { MinecraftVersionJSON, DownloadFile, LaunchOptions } from '../types.js';
/**
 * This class is responsible for:
 *  - Gathering library download info from the version JSON
 *  - Handling custom asset entries if provided
 *  - Extracting native libraries for the current OS
 */
export default class Libraries {
    private json;
    private readonly options;
    constructor(options: LaunchOptions);
    Getlibraries(json: MinecraftVersionJSON): Promise<DownloadFile[]>;
    GetLogging(): Promise<DownloadFile[]>;
    /**
     * Fetches custom assets or libraries from a remote URL if provided.
     * This method expects the response to be an array of objects with
     * "path", "hash", "size", and "url".
     *
     * @param url The remote URL that returns a JSON array of CustomAssetItem
     * @returns   An array of LibraryDownload entries describing each item
     */
    GetAssetsOthers(url: string | null): Promise<DownloadFile[]>;
    /**
     * Extracts native libraries from the downloaded jars (those marked type="Native")
     * and places them into the "natives" folder under "versions/<id>/natives".
     *
     * @param bundle An array of library entries (some of which may be natives)
     * @returns The paths of the native files that were extracted
     */
    natives(bundle: DownloadFile[]): Promise<string[]>;
}
