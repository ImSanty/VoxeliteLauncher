/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { LaunchOptions, LoaderJSON, LoaderArguments } from '../types.js';
/**
 * This class manages the installation and argument-building for a Minecraft
 * mod loader (e.g. Forge, Fabric). It wraps a `LoaderDownloader` and emits
 * the same events for progress, extraction, patching, etc.
 */
export default class MinecraftLoader extends EventEmitter {
    private options;
    private loaderPath;
    constructor(options: LaunchOptions);
    /**
     * Installs the loader for a given Minecraft version using a LoaderDownloader,
     * returning the loader's JSON on completion. This function emits several events
     * for progress reporting and patch notifications.
     *
     * @param version  The Minecraft version (e.g. "1.19.2")
     * @param javaPath Path to the Java executable used by the loader for patching
     * @returns        A Promise that resolves to the loader's JSON configuration
     */
    GetLoader(version: string, javaPath: string): Promise<LoaderJSON>;
    GetArguments(json: LoaderJSON | null, version: string): Promise<LoaderArguments>;
}
