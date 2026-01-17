/**
 * API client for communicating with the API service
 */
const { config, logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('api-client');

class ApiClient {
  constructor() {
    this.baseUrl = config.api.url;
    this.apiKey = config.api.key;
  }

  /**
   * Make an API request
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {object} data - Request body
   * @returns {Promise<object>}
   */
  async request(method, path, data = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
    };

    const options = {
      method,
      headers,
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `API error: ${response.status}`);
      }

      return result;
    } catch (error) {
      logger.error(`API request failed: ${method} ${path}`, { error: error.message });
      throw error;
    }
  }

  // Convenience methods
  async get(path) {
    return this.request('GET', path);
  }

  async post(path, data) {
    return this.request('POST', path, data);
  }

  async put(path, data) {
    return this.request('PUT', path, data);
  }

  async patch(path, data) {
    return this.request('PATCH', path, data);
  }

  async delete(path) {
    return this.request('DELETE', path);
  }

  // API endpoints
  async getHealth() {
    return this.get('/health');
  }

  async getUser(discordId) {
    return this.get(`/api/users/${discordId}`);
  }

  async createUser(data) {
    return this.post('/api/users', data);
  }

  async getServer(discordId) {
    return this.get(`/api/servers/${discordId}`);
  }
}

module.exports = new ApiClient();