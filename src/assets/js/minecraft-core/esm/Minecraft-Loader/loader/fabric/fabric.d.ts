/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { FabricLoaderData, FabricJSON } from '../../../types.js';
interface FabricOptions {
    path: string;
    downloadFileMultiple?: number;
    loader: {
        version: string;
        build: string;
    };
}
interface FabricLibrary {
    name: string;
    url: string;
    rules?: Array<Record<string, unknown>>;
}
/**
 * This class handles downloading Fabric loader JSON metadata,
 * resolving the correct build, and downloading the required libraries.
 */
export default class FabricMC extends EventEmitter {
    private readonly options;
    constructor(options: FabricOptions);
    /**
     * Fetches the Fabric loader metadata to find the correct build for the given
     * Minecraft version. If the specified build is "latest" or "recommended",
     * it uses the first (most recent) entry. Otherwise, it looks up a specific build.
     *
     * @param Loader A LoaderObject describing metadata and json URL templates.
     * @returns A JSON object representing the Fabric loader profile, or an error object.
     */
    downloadJson(Loader: FabricLoaderData): Promise<FabricJSON | {
        error: string;
    }>;
    /**
     * Downloads any missing libraries defined in the Fabric JSON manifest,
     * skipping those that already exist locally (or that have rules preventing download).
     *
     * @param fabricJson The Fabric JSON object with a `libraries` array.
     * @returns The same `libraries` array after downloading as needed.
     */
    downloadLibraries(fabricJson: FabricJSON): Promise<FabricLibrary[]>;
}
export {};
