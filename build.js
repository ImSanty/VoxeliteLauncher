const fs = require('fs');
const path = require('path');
const builder = require('electron-builder');
const JavaScriptObfuscator = require('javascript-obfuscator');
const fetch = require('node-fetch');
const png2icons = require('png2icons');
const Jimp = require('jimp');

const { preductname } = require('./package.json');

class BuildPipeline {
  constructor() {
    this.shouldObfuscate = true;
    this.sourceFiles = [];
  }

  async init() {
    const args = process.argv.slice(2);

    for (let index = 0; index < args.length; index += 1) {
      const arg = args[index];

      if (arg.startsWith('--icon')) {
        const url = arg.includes('=') ? arg.split('=')[1] : args[index + 1];
        if (!url) {
          throw new Error('Missing value for --icon argument');
        }
        await this.setIcons(url);
        continue;
      }

      if (arg.startsWith('--obf')) {
        const value = arg.includes('=') ? arg.split('=')[1] : 'true';
        this.shouldObfuscate = JSON.parse(value);
        this.sourceFiles = this.getFiles('src');
        continue;
      }

      if (arg.startsWith('--build')) {
        const value = arg.includes('=') ? arg.split('=')[1] : 'platform';
        if (value === 'platform') {
          await this.buildPlatform();
        }
      }
    }
  }

  async buildPlatform() {
    if (!this.sourceFiles.length) {
      this.sourceFiles = this.getFiles('src');
    }

    await this.obfuscateSources();

    try {
      await builder.build({
        config: {
          generateUpdatesFilesForAllChannels: false,
          appId: preductname,
          productName: preductname,
          copyright: 'Copyright © 2020-2025 SantiAgüero',
          artifactName: '${productName}-${os}-${arch}.${ext}',
          extraMetadata: { main: 'app/app.js' },
          files: ['app/**/*', 'package.json', 'LICENSE.md'],
          directories: { output: 'dist' },
          compression: 'maximum',
          asar: true,
          publish: [
            {
              provider: 'github',
              releaseType: 'release'
            }
          ],
          win: {
            icon: './app/assets/images/icon.ico',
            target: [
              {
                target: 'nsis',
                arch: 'x64'
              }
            ]
          },
          nsis: {
            oneClick: true,
            allowToChangeInstallationDirectory: false,
            createDesktopShortcut: true,
            runAfterFinish: true
          },
          mac: {
            icon: './app/assets/images/icon.icns',
            category: 'public.app-category.games',
            identity: null,
            target: [
              {
                target: 'dmg',
                arch: 'universal'
              },
              {
                target: 'zip',
                arch: 'universal'
              }
            ]
          },
          linux: {
            icon: './app/assets/images/icon.png',
            target: [
              {
                target: 'AppImage',
                arch: 'x64'
              }
            ]
          }
        }
      });
      console.log('Build completed successfully');
    } catch (error) {
      console.error('Build failed', error);
      throw error;
    }
  }

  async obfuscateSources() {
    if (fs.existsSync('./app')) {
      fs.rmSync('./app', { recursive: true, force: true });
    }

    for (const filePath of this.sourceFiles) {
      const fileName = path.basename(filePath);
      const extension = path.extname(fileName).toLowerCase();
      const targetFolder = path.dirname(filePath).replace('src', 'app');

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      if (extension === '.js') {
        let code = fs.readFileSync(filePath, 'utf8');
        code = code.replace(/src\//g, 'app/');

        if (this.shouldObfuscate) {
          try {
            console.log(`Obfuscate ${filePath}`);
            const obfuscated = JavaScriptObfuscator.obfuscate(code, {
              optionsPreset: 'medium-obfuscation',
              disableConsoleOutput: false,
              target: 'node'
            });
            fs.writeFileSync(
              path.join(targetFolder, fileName),
              obfuscated.getObfuscatedCode(),
              'utf8'
            );
          } catch (error) {
            throw new Error(
              `Obfuscation failed for ${filePath}: ${error.message}`
            );
          }
        } else {
          console.log(`Copy ${filePath}`);
          fs.writeFileSync(path.join(targetFolder, fileName), code, 'utf8');
        }
      } else {
        fs.copyFileSync(filePath, path.join(targetFolder, fileName));
      }
    }
  }

  getFiles(entry, acc = []) {
    if (!fs.existsSync(entry)) {
      return acc;
    }

    const stats = fs.statSync(entry);
    if (stats.isFile()) {
      acc.push(entry.replace(/\\/g, '/'));
      return acc;
    }

    const contents = fs.readdirSync(entry);
    for (const name of contents) {
      this.getFiles(path.join(entry, name), acc);
    }
    return acc;
  }

  async setIcons(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch icon (${response.status})`);
    }

    const buffer = await response.buffer();
    const image = await Jimp.read(buffer);
    const resized = await image.resize(256, 256).getBufferAsync(Jimp.MIME_PNG);

    fs.writeFileSync(
      'src/assets/images/icon.icns',
      png2icons.createICNS(resized, png2icons.BILINEAR, 0)
    );
    fs.writeFileSync(
      'src/assets/images/icon.ico',
      png2icons.createICO(resized, png2icons.HERMITE, 0, false)
    );
    fs.writeFileSync('src/assets/images/icon.png', resized);
    console.log('Launcher icons updated');
  }
}

(async () => {
  try {
    await new BuildPipeline().init();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
