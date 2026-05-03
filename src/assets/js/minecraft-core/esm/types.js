/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 *
 * Centralized type definitions for minecraft-java-core.
 * All shared types are defined here for easier maintenance.
 */
// ========================
// OS Mappings
// ========================
/** Maps Node.js platforms to Mojang's OS naming */
export const MOJANG_OS_MAP = {
    win32: 'windows',
    darwin: 'osx',
    linux: 'linux'
};
/** Maps Node.js arch to Mojang's arch replacements */
export const MOJANG_ARCH_MAP = {
    x32: '32',
    x64: '64',
    arm: '32',
    arm64: '64'
};
//# sourceMappingURL=types.js.map