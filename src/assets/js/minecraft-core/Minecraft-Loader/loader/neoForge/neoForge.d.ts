/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { ForgeInstallProfile, MinecraftLibrary, NeoForgeLoaderData, PatcherProcessor } from '../../../types.js';
interface NeoForgeOptions {
    path: string;
    loader: {
        version: string;
        build: string;
        config: {
            javaPath: string;
            minecraftJar: string;
            minecraftJson: string;
        };
        type: string;
    };
    downloadFileMultiple?: number;
}
interface DownloadInstallerResult {
    filePath?: string;
    oldAPI?: boolean;
    error?: string;
}
interface NeoForgeProfile {
    install?: ForgeInstallProfile;
    version?: Record<string, unknown> & {
        id?: string;
        libraries?: MinecraftLibrary[];
    };
    data?: Record<string, {
        client: string;
    }>;
    filePath?: string;
    path?: string;
    processors?: PatcherProcessor[];
    libraries?: MinecraftLibrary[];
    error?: {
        message: string;
    };
}
/**
 * This class handles downloading and installing NeoForge (formerly Forge) for Minecraft,
 * including picking the correct build, extracting libraries, and running patchers if needed.
 */
export default class NeoForgeMC extends EventEmitter {
    private readonly options;
    constructor(options: NeoForgeOptions);
    /**
     * Converts a NeoForge version string to its corresponding Minecraft version.
     * Handles all NeoForge versioning formats:
     *
     * - Snapshot special: "0.25w14craftmine.3-beta" → "25w14craftmine"
     * - 4-parts + suffix: "26.1.0.0-alpha.1+snapshot-1" → "26.1-snapshot-1"
     * - 4-parts + suffix: "26.1.0.0-alpha.15+pre-3" → "26.1-pre-3"
     * - 4-parts patch 0: "26.1.0.1-beta" → "26.1"
     * - 4-parts patch >0: "26.1.1.0-beta" → "26.1.1"
     * - 3-parts classic: "21.4.121" → "1.21.4"
     * - 3-parts minor=0: "21.0.143" → "1.21"
     *
     * @param version The NeoForge version string
     * @returns The corresponding Minecraft version, or null if unrecognized
     */
    private neoforgeVersionToMinecraft;
    /**
     * Downloads the NeoForge installer jar for the specified version and build,
     * either using a legacy API or the newer metaData approach. If "latest" or "recommended"
     * is specified, it picks the newest build from the filtered list.
     *
     * Uses neoforgeVersionToMinecraft() to map each NeoForge version to its
     * Minecraft version, supporting all formats (releases, snapshots, pre-releases,
     * 4-part 2026+ versions, etc.).
     *
     * @param Loader An object containing URLs and patterns for legacy and new metadata/installers.
     * @returns      An object with filePath and oldAPI fields, or an error.
     */
    downloadInstaller(Loader: NeoForgeLoaderData): Promise<DownloadInstallerResult>;
    /**
     * Extracts the main JSON profile (install_profile.json) from the NeoForge installer.
     * If the JSON references an additional file, it also extracts and parses that, returning
     * a unified object with `install` and `version` keys.
     *
     * @param pathInstaller Full path to the downloaded NeoForge installer jar.
     * @returns A NeoForgeProfile object, or an error if invalid.
     */
    extractProfile(pathInstaller: string): Promise<NeoForgeProfile | {
        error: {
            message: string;
        };
    }>;
    /**
     * Extracts the universal jar or associated files for NeoForge into the local "libraries" directory.
     * Also handles client.lzma if processors are present. Returns a boolean indicating whether we skip
     * certain neoforge libraries in subsequent steps.
     *
     * @param profile    The extracted NeoForge profile with file path references
     * @param pathInstaller Path to the NeoForge installer
     * @param oldAPI     Whether we are dealing with the old or new NeoForge API (affects library naming)
     * @returns          A boolean indicating if we should filter out certain libraries afterwards
     */
    extractUniversalJar(profile: NeoForgeProfile, pathInstaller: string, oldAPI: boolean): Promise<boolean>;
    /**
     * Downloads all libraries referenced in the NeoForge profile. If skipNeoForgeFilter is true,
     * certain core libraries are excluded. Checks for duplicates and local existence before downloading.
     *
     * @param profile           The NeoForge profile containing version/install libraries
     * @param skipNeoForgeFilter Whether we skip specific "net.minecraftforge:neoforged" libs
     * @returns An array of library objects after download, or an error object if something fails
     */
    downloadLibraries(profile: NeoForgeProfile, skipNeoForgeFilter: boolean): Promise<MinecraftLibrary[] | {
        error: string;
    }>;
    /**
     * Runs the NeoForge patch process, if any processors exist. Checks if patching is needed,
     * then uses the `NeoForgePatcher` class. If the patch is already applied, it skips.
     *
     * @param profile The NeoForge profile, which may include processors.
     * @param oldAPI  Whether we are dealing with the old or new API (passed to the patcher).
     * @returns       True on success or if no patch was needed.
     */
    patchneoForge(profile: NeoForgeProfile, oldAPI: boolean): Promise<boolean>;
}
export {};
