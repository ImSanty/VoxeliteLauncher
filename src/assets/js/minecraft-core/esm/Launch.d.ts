/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { LaunchOptions, LoaderJSON, MinecraftVersionJSON, JavaDownloadResult } from './types.js';
export type LaunchOPTS = LaunchOptions;
export default class Launch extends EventEmitter {
    options: LaunchOptions;
    Launch(opt: LaunchOptions): Promise<boolean>;
    start(): Promise<boolean>;
    DownloadGame(): Promise<{
        minecraftJson: MinecraftVersionJSON;
        minecraftLoader: LoaderJSON | null;
        minecraftVersion: string;
        minecraftJava: JavaDownloadResult;
    } | void>;
}
