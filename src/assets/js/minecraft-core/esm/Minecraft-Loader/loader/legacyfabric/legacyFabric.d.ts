/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { FabricLoaderData, FabricJSON } from '../../../types.js';
interface FabricOptions {
    path: string;
    loader: {
        version: string;
        build: string;
    };
    downloadFileMultiple?: number;
}
interface FabricLibrary {
    name: string;
    url: string;
    rules?: Array<Record<string, unknown>>;
}
/**
 * A class that handles downloading the Fabric loader JSON metadata
 * and the libraries needed to launch Fabric.
 */
export default class FabricMC extends EventEmitter {
    private readonly options;
    constructor(options?: FabricOptions);
    /**
     * Fetches metadata from the Fabric API to identify the correct build for the given version.
     * If the build is "latest" or "recommended", it picks the first entry from the loader array.
     * Otherwise, it tries to match the specific build requested by the user.
     *
     * @param Loader A LoaderObject with metaData and json URLs for Fabric.
     * @returns      A FabricJSON object on success, or an error object.
     */
    downloadJson(Loader: FabricLoaderData): Promise<FabricJSON | {
        error: string;
    }>;
    /**
     * Iterates over the libraries in the Fabric JSON, checks if they exist locally,
     * and if not, downloads them. Skips libraries that have "rules" (usually platform-specific).
     *
     * @param json The Fabric loader JSON object with a "libraries" array.
     * @returns    The same libraries array after downloads, or an error object if something fails.
     */
    downloadLibraries(json: FabricJSON): Promise<FabricLibrary[]>;
}
export {};
