/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import { EventEmitter } from 'events';
import type { PatcherProfile, PatcherConfig } from '../types.js';
export type { PatcherProfile as Profile };
interface ForgePatcherOptions {
    path: string;
    loader: {
        type: string;
    };
}
export default class ForgePatcher extends EventEmitter {
    private readonly options;
    constructor(options: ForgePatcherOptions);
    patcher(profile: PatcherProfile, config: PatcherConfig, neoForgeOld?: boolean): Promise<void>;
    check(profile: PatcherProfile): boolean;
    private setArgument;
    private computePath;
    private readJarManifest;
}
