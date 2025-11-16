/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const pkg = require('../package.json');
const nodeFetch = require('node-fetch');
const convert = require('xml-js');

const sanitizedBaseUrl = (() => {
  const candidate = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
  return typeof candidate === 'string' ? candidate.replace(/\/+$/u, '') : '';
})();

let url = sanitizedBaseUrl;

let config = `${url}/launcher/config/config.json`;
let news = `${url}/launcher/config/news.json`;
let instances = `${url}/launcher/config/instances.json`;
let filesEndpoint = `${url}/launcher/files`;

class Config {
  GetConfig() {
    return new Promise((resolve, reject) => {
      nodeFetch(config)
        .then(async (config) => {
          if (config.status === 200) return resolve(config.json());
          else
            return reject({
              error: {
                code: config.statusText,
                message: 'No se puedo conectar con el servidor'
              }
            });
        })
        .catch((error) => {
          return reject({ error });
        });
    });
  }

  async getInstanceList() {
    try {
      const response = await nodeFetch(instances);

      if (!response.ok) {
        throw new Error(response.statusText || 'Unable to fetch instances');
      }

      const payload = await response.json();

      if (Array.isArray(payload)) {
        return payload
          .filter((entry) => entry && typeof entry === 'object')
          .map((entry) => normalizeInstanceEntry(entry))
          .filter(Boolean);
      }

      if (payload && typeof payload === 'object') {
        return Object.entries(payload)
          .map(([name, data]) =>
            normalizeInstanceEntry({
              name,
              ...(data && typeof data === 'object' ? data : {})
            })
          )
          .filter(Boolean);
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async getNews() {
    let config = (await this.GetConfig()) || {};

    if (config.rss) {
      return new Promise((resolve, reject) => {
        nodeFetch(config.rss)
          .then(async (config) => {
            if (config.status === 200) {
              let news = [];
              let response = await config.text();
              response = JSON.parse(
                convert.xml2json(response, { compact: true })
              )?.rss?.channel?.item;

              if (!Array.isArray(response)) response = [response];
              for (let item of response) {
                news.push({
                  title: item.title._text,
                  content: item['content:encoded']._text,
                  author: item['dc:creator']._text,
                  publish_date: item.pubDate._text
                });
              }
              return resolve(news);
            } else
              return reject({
                error: {
                  code: config.statusText,
                  message: 'No se puedo conectar con el servidor'
                }
              });
          })
          .catch((error) => reject({ error }));
      });
    } else {
      return new Promise((resolve, reject) => {
        nodeFetch(news)
          .then(async (config) => {
            if (config.status === 200) return resolve(config.json());
            else
              return reject({
                error: {
                  code: config.statusText,
                  message: 'No se puedo conectar con el servidor'
                }
              });
          })
          .catch((error) => {
            return reject({ error });
          });
      });
    }
  }
}

export default new Config();

function normalizeInstanceEntry(entry) {
  const result = { ...(entry && typeof entry === 'object' ? entry : {}) };
  const nameCandidate = result.name || result.instance || '';
  result.name = typeof nameCandidate === 'string' ? nameCandidate : '';

  if (!result.name) {
    return null;
  }

  if (result.name && (!result.url || typeof result.url !== 'string')) {
    result.url = `${filesEndpoint}?instance=${encodeURIComponent(result.name)}`;
  }

  return result;
}
