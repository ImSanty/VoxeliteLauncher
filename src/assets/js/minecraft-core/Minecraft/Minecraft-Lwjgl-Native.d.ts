/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import type { MinecraftVersionJSON, LaunchOptions } from '../types.js';
/**
 * This class modifies the version JSON for ARM-based Linux systems,
 * specifically handling LWJGL library replacements.
 */
export default class MinecraftLoader {
    private options;
    constructor(options: LaunchOptions);
    /**
     * Processes a Minecraft version JSON, removing default JInput and LWJGL entries
     * if needed, then injecting ARM-compatible LWJGL libraries from local JSON files.
     *
     * @param version A MinecraftVersion object containing a list of libraries
     * @returns The same version object, but with updated libraries for ARM-based Linux
     */
    ProcessJson(version: MinecraftVersionJSON): Promise<MinecraftVersionJSON>;
}
