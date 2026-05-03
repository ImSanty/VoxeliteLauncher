import type { AssetItem, LaunchOptions, MinecraftVersionJSON } from '../types.js';
/**
 * Class responsible for handling Minecraft asset index fetching
 * and optionally copying legacy assets to the correct directory.
 */
export default class MinecraftAssets {
    private assetIndex;
    private readonly options;
    constructor(options: LaunchOptions);
    /**
     * Fetches the asset index from the provided JSON object, then constructs
     * and returns an array of asset download objects. These can be processed
     * by a downloader to ensure all assets are present locally.
     *
     * @param versionJson A JSON object containing an "assetIndex" field.
     * @returns An array of AssetItem objects with download info.
     */
    getAssets(versionJson: MinecraftVersionJSON): Promise<AssetItem[]>;
    /**
     * Copies legacy assets (when using older versions of Minecraft) from
     * the main "objects" folder to a "resources" folder, preserving the
     * directory structure.
     *
     * @param versionJson A JSON object that has an "assets" property for the index name.
     */
    copyAssets(versionJson: MinecraftVersionJSON): void;
}
