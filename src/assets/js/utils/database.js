/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ipcRenderer } = require('electron');

// Encryption configuration
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.createHash('sha256').update('VoxeliteLauncher').digest();
const IV_LENGTH = 16;

/**
 * Encrypts a string
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a string
 */
function decrypt(text) {
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

async function resolveDatabasePath() {
  const basePath = await ipcRenderer.invoke('database-path');
  return basePath.replace(/\\/g, '/');
}

class database {
  constructor() {
    this.basePath = null;
  }

  async ensurePath() {
    if (!this.basePath) {
      this.basePath = await resolveDatabasePath();
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
      }
    }
  }

  getFilePath(tableName) {
    return path.join(this.basePath, `${tableName}.vdb`);
  }

  async loadTable(tableName) {
    await this.ensurePath();
    const filePath = this.getFilePath(tableName);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const encryptedData = fs.readFileSync(filePath, 'utf8');
    const jsonData = decrypt(encryptedData);
    if (!jsonData) return [];
    try {
      return JSON.parse(jsonData);
    } catch (e) {
      return [];
    }
  }

  async saveTable(tableName, data) {
    await this.ensurePath();
    const filePath = this.getFilePath(tableName);
    const jsonData = JSON.stringify(data);
    const encryptedData = encrypt(jsonData);
    fs.writeFileSync(filePath, encryptedData, 'utf8');
  }

  async creatDatabase(tableName, tableConfig) {
    await this.ensurePath();
    return tableName;
  }

  async getDatabase(tableName) {
    return tableName;
  }

  async createData(tableName, data) {
    const table = await this.loadTable(tableName);
    const id = table.length > 0 ? Math.max(...table.map((i) => i.id || 0)) + 1 : 1;
    
    const record = {
      id: id,
      json_data: JSON.stringify(data)
    };
    
    table.push(record);
    await this.saveTable(tableName, table);
    
    const result = JSON.parse(record.json_data);
    result.ID = record.id;
    return result;
  }

  async readData(tableName, key = 1) {
    const table = await this.loadTable(tableName);
    const record = table.find((i) => i.id == key);
    if (record) {
      const data = JSON.parse(record.json_data);
      data.ID = record.id;
      return data;
    }
    return undefined;
  }

  async readAllData(tableName) {
    const table = await this.loadTable(tableName);
    return table.map((record) => {
      const data = JSON.parse(record.json_data);
      data.ID = record.id;
      return data;
    });
  }

  async updateData(tableName, data, key = 1) {
    const table = await this.loadTable(tableName);
    const index = table.findIndex((i) => i.id == key);
    if (index !== -1) {
      table[index].json_data = JSON.stringify(data);
      await this.saveTable(tableName, table);
    }
  }

  async deleteData(tableName, key = 1) {
    const table = await this.loadTable(tableName);
    const filtered = table.filter((i) => i.id != key);
    if (filtered.length !== table.length) {
      await this.saveTable(tableName, filtered);
    }
  }
}

export default database;
