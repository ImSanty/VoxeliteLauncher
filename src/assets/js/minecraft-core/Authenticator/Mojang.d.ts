/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
import type { MojangAuthResponse } from '../types.js';
declare function login(username: string, password?: string): Promise<MojangAuthResponse>;
declare function refresh(acc: MojangAuthResponse): Promise<MojangAuthResponse>;
declare function validate(acc: MojangAuthResponse): Promise<boolean>;
declare function signout(acc: MojangAuthResponse): Promise<boolean>;
declare function ChangeAuthApi(url: string): void;
export { login, refresh, validate, signout, ChangeAuthApi };
