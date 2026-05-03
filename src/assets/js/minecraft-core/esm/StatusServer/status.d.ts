/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
interface ServerStatus {
    error: boolean;
    ms: number;
    version: string;
    playersConnect: number;
    playersMax: number;
}
export default class status {
    ip: string;
    port: number;
    constructor(ip?: string, port?: number);
    getStatus(): Promise<ServerStatus>;
}
export {};
