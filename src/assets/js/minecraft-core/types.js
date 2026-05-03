"use strict";
/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 *
 * Centralized type definitions for minecraft-java-core.
 * All shared types are defined here for easier maintenance.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOJANG_ARCH_MAP = exports.MOJANG_OS_MAP = void 0;
// ========================
// OS Mappings
// ========================
/** Maps Node.js platforms to Mojang's OS naming */
exports.MOJANG_OS_MAP = {
    win32: 'windows',
    darwin: 'osx',
    linux: 'linux'
};
/** Maps Node.js arch to Mojang's arch replacements */
exports.MOJANG_ARCH_MAP = {
    x32: '32',
    x64: '64',
    arm: '32',
    arm64: '64'
};
//# sourceMappingURL=types.js.map