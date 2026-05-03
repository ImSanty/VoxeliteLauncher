/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { LoaderType, LoaderDownloaderOptions } from '../types.js';
export type { LoaderType };
/**
 * The main Loader class that orchestrates installation of different
 * Minecraft mod loaders (Forge, Fabric, LegacyFabric, Quilt, etc.).
 */
export default class Loader extends EventEmitter {
    private readonly options;
    constructor(options: LoaderDownloaderOptions);
    /**
     * Main entry point for installing the selected loader.
     * Checks the loader type from `this.options.loader.type` and delegates to the appropriate method.
     * Emits:
     *  - "error" if the loader is not found or if an installation step fails
     *  - "json" upon successful completion, returning the version JSON or loader info
     */
    install(): Promise<void>;
    /**
     * Handles Forge installation by:
     *  1. Downloading the installer
     *  2. Depending on installer type, extracting an install profile or creating a merged Jar
     *  3. Downloading required libraries
     *  4. Patching Forge if necessary
     *  5. Returns the final version JSON object or an error
     */
    private forge;
    /**
     * Manages installation flow for NeoForge:
     *  1. Download the installer
     *  2. Extract the install profile
     *  3. Extract the universal jar
     *  4. Download libraries
     *  5. Patch if needed
     */
    private neoForge;
    /**
     * Installs Fabric:
     *  1. Download the loader JSON
     *  2. Save it as a version .json
     *  3. Download required libraries
     */
    private fabric;
    /**
     * Installs Legacy Fabric:
     *  1. Download JSON
     *  2. Save version .json
     *  3. Download libraries
     */
    private legacyFabric;
    /**
     * Installs Quilt:
     *  1. Download the loader JSON
     *  2. Write to a version file
     *  3. Download required libraries
     */
    private quilt;
}
