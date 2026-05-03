/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import type { LaunchOptions, MinecraftVersionJSON, LoaderJSON, LaunchArguments } from '../types.js';
/**
 * Builds and organizes JVM and game arguments required to launch Minecraft.
 */
export default class MinecraftArguments {
    private options;
    private authenticator;
    constructor(options: LaunchOptions);
    /**
     * Gathers all arguments (game, JVM, classpath) and returns them for launching.
     */
    GetArguments(versionJson: MinecraftVersionJSON, loaderJson?: LoaderJSON): Promise<LaunchArguments>;
    /**
     * Builds the Minecraft game arguments, injecting authentication tokens,
     * user info, and any loader arguments if present.
     * @param versionJson The Minecraft version JSON.
     * @param loaderJson  The loader JSON (e.g., Forge) if applicable.
     */
    GetGameArguments(versionJson: MinecraftVersionJSON, loaderJson?: LoaderJSON): Promise<Array<string>>;
    /**
     * Evaluates rules for arguments (OS, version, features).
     * @param rules Array of rules to evaluate.
     * @returns true if all rules pass, false otherwise.
     */
    private EvaluateRules;
    /**
     * Extracts the key from a JVM argument for comparison.
     * @param arg The JVM argument to extract the key from.
     */
    private getArgKey;
    /**
     * Processes default-user-jvm arguments from the version JSON.
     * @param versionJson The Minecraft version JSON.
     * @param existingArgs Existing JVM arguments to check for duplicates.
     * @returns Array of default JVM arguments to add.
     */
    private ProcessDefaultUserJVMArgs;
    /**
     * Builds the JVM arguments needed by Minecraft. This includes memory settings,
     * OS-specific options, and any additional arguments supplied by the user.
     * @param versionJson The Minecraft version JSON.
     */
    GetJVMArguments(versionJson: MinecraftVersionJSON): Promise<Array<string>>;
    /**
     * Constructs the classpath (including libraries) that Minecraft requires
     * to launch, and identifies the main class. Optionally merges loader libraries.
     * @param versionJson The Minecraft version JSON.
     * @param loaderJson  The loader JSON (e.g., Forge, Fabric) if applicable.
     */
    GetClassPath(versionJson: MinecraftVersionJSON, loaderJson?: LoaderJSON): Promise<{
        classpath: Array<string>;
        mainClass: string | undefined;
    }>;
}
