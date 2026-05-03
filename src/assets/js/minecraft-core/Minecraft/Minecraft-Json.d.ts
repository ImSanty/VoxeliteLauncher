/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import type { GetInfoVersionResult, GetInfoVersionError, LaunchOptions } from '../types.js';
export type { GetInfoVersionResult, GetInfoVersionError };
/**
 * This class retrieves Minecraft version information from Mojang's
 * version manifest, and optionally processes the JSON for ARM-based Linux.
 */
export default class Json {
    private readonly options;
    constructor(options: LaunchOptions);
    /**
     * Fetches the Mojang version manifest, resolves the intended version (release, snapshot, etc.),
     * and returns the associated JSON object for that version.
     * If the system is Linux ARM, it will run additional processing on the JSON.
     *
     * @returns An object containing { InfoVersion, json, version }, or an error object.
     */
    GetInfoVersion(): Promise<GetInfoVersionResult | GetInfoVersionError>;
}
