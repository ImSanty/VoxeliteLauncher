/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import EventEmitter from 'events';
import type { LaunchOptions, MinecraftVersionJSON, JavaDownloadResult, JavaFileItem } from '../types.js';
export type { JavaDownloadResult, JavaFileItem };
/**
 * Manages the download and extraction of the correct Java runtime for Minecraft.
 * It supports both Mojang's curated list and Azul fallback.
 */
export default class JavaDownloader extends EventEmitter {
    private options;
    constructor(options: LaunchOptions);
    /**
     * Retrieves Java files from Mojang's runtime metadata if possible,
     * otherwise falls back to getJavaOther().
     *
     * @param jsonversion A JSON object describing the Minecraft version (with optional javaVersion).
     * @returns An object containing a list of JavaFileItems and the final path to "java".
     */
    getJavaFiles(jsonversion: MinecraftVersionJSON): Promise<JavaDownloadResult>;
    /**
     * Fallback method to download Java from Adoptium if Mojang's metadata is unavailable
     * or doesn't have the appropriate runtime for the user's platform/arch.
     *
     * @param jsonversion A Minecraft version JSON (with optional javaVersion).
     * @param versionDownload A forced Java version (string) if provided by the user.
     */
    getJavaOther(jsonversion: MinecraftVersionJSON, versionDownload?: string): Promise<JavaDownloadResult>;
    /**
     * Maps the Node `os.platform()` and `os.arch()` to Adoptium's expected format.
     * Apple Silicon can optionally download x64 if `intelEnabledMac` is true.
     */
    private getPlatformArch;
    /**
     * Verifies if the Java archive already exists and matches the expected checksum.
     * If it doesn't exist or fails the hash check, it downloads from the given URL.
     *
     * @param params.filePath   The local file path
     * @param params.pathFolder The folder to place the file in
     * @param params.fileName   The name of the file
     * @param params.url        The remote download URL
     * @param params.checksum   Expected SHA-256 hash
     */
    private verifyAndDownloadFile;
}
