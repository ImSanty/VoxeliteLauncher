"use strict";
/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
const index_js_1 = __importDefault(require("../Minecraft-Loader/index.js"));
/**
 * This class manages the installation and argument-building for a Minecraft
 * mod loader (e.g. Forge, Fabric). It wraps a `LoaderDownloader` and emits
 * the same events for progress, extraction, patching, etc.
 */
class MinecraftLoader extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.options = options;
        this.loaderPath = path_1.default.join(this.options.path, this.options.loader.path);
    }
    /**
     * Installs the loader for a given Minecraft version using a LoaderDownloader,
     * returning the loader's JSON on completion. This function emits several events
     * for progress reporting and patch notifications.
     *
     * @param version  The Minecraft version (e.g. "1.19.2")
     * @param javaPath Path to the Java executable used by the loader for patching
     * @returns        A Promise that resolves to the loader's JSON configuration
     */
    async GetLoader(version, javaPath) {
        const loader = new index_js_1.default({
            path: this.loaderPath,
            downloadFileMultiple: this.options.downloadFileMultiple,
            loader: {
                type: this.options.loader.type,
                version: version,
                build: this.options.loader.build,
                config: {
                    javaPath,
                    minecraftJar: `${this.options.path}/versions/${version}/${version}.jar`,
                    minecraftJson: `${this.options.path}/versions/${version}/${version}.json`
                }
            }
        });
        return new Promise((resolve, reject) => {
            loader.install();
            loader.on('json', (json) => {
                const modifiedJson = json;
                if (modifiedJson.libraries) {
                    modifiedJson.libraries = modifiedJson.libraries.map(lib => {
                        lib.loader = this.loaderPath;
                        return lib;
                    });
                }
                resolve(modifiedJson);
            });
            loader.on('extract', (extract) => {
                this.emit('extract', extract);
            });
            loader.on('progress', (progress, size, element) => {
                this.emit('progress', progress, size, element);
            });
            loader.on('check', (progress, size, element) => {
                this.emit('check', progress, size, element);
            });
            loader.on('patch', (patch) => {
                this.emit('patch', patch);
            });
            loader.on('error', (err) => {
                reject(err);
            });
        });
    }
    async GetArguments(json, version) {
        // If no loader JSON is provided, return empty arrays
        if (json === null) {
            return { game: [], jvm: [] };
        }
        const moddedArgs = json.arguments;
        if (!moddedArgs)
            return { game: [], jvm: [] };
        const args = { game: [], jvm: [] };
        if (moddedArgs.game) {
            args.game = moddedArgs.game;
        }
        if (moddedArgs.jvm) {
            args.jvm = moddedArgs.jvm.map((jvmArg) => jvmArg
                .replace(/\${version_name}/g, version)
                .replace(/\${library_directory}/g, `${this.loaderPath}/libraries`)
                .replace(/\${classpath_separator}/g, process.platform === 'win32' ? ';' : ':'));
        }
        args.mainClass = json.mainClass;
        return args;
    }
}
exports.default = MinecraftLoader;
//# sourceMappingURL=Minecraft-Loader.js.map