/**
 * Browser API Manager
 * 
 * This module provides a unified interface for browser APIs across 
 * different browsers (Chrome and Firefox).
 */

// Detect browser environment
const browserAPI = (() => {
  // Firefox uses the 'browser' namespace, Chrome uses 'chrome'
  const api = typeof browser !== 'undefined' ? browser : chrome;
  
  // Check if we're in a Firefox environment (Promise-based API)
  const isFirefox = typeof browser !== 'undefined';

  /**
   * Wraps Chrome's callback-based API to return a Promise
   * @param {Object} obj - The Chrome API object (e.g., chrome.storage.sync)
   * @param {string} method - The method name to wrap (e.g., 'get')
   * @param {...any} args - Arguments to pass to the method
   * @returns {Promise} A promise that resolves with the result
   */
  const chromeAPIAsPromise = (obj, method, ...args) => {
    return new Promise((resolve, reject) => {
      obj[method](...args, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  };

  return {
    // Storage API
    storage: {
      /**
       * Get data from storage
       * @param {string|Array|Object} keys - Keys to get from storage
       * @returns {Promise} Promise resolving with storage data
       */
      get: (keys) => {
        if (isFirefox) {
          return api.storage.sync.get(keys);
        } else {
          return chromeAPIAsPromise(api.storage.sync, 'get', keys);
        }
      },

      /**
       * Save data to storage
       * @param {Object} data - Data to store
       * @returns {Promise} Promise resolving when data is stored
       */
      set: (data) => {
        if (isFirefox) {
          return api.storage.sync.set(data);
        } else {
          return chromeAPIAsPromise(api.storage.sync, 'set', data);
        }
      }
    },

    // Runtime API
    runtime: {
      /**
       * Get URL for resource within extension
       * @param {string} path - Path to resource
       * @returns {string} Full URL to the resource
       */
      getURL: (path) => {
        return api.runtime.getURL(path);
      },

      /**
       * Add a message listener
       * @param {Function} callback - Listener function
       */
      onMessage: {
        addListener: (callback) => {
          api.runtime.onMessage.addListener(callback);
        },
        removeListener: (callback) => {
          api.runtime.onMessage.removeListener(callback);
        }
      },

      /**
       * Send a message
       * @param {Object} message - Message to send
       * @returns {Promise} Promise resolving with the response
       */
      sendMessage: (message) => {
        if (isFirefox) {
          return api.runtime.sendMessage(message);
        } else {
          return chromeAPIAsPromise(api.runtime, 'sendMessage', message);
        }
      }
    },

    // Tabs API
    tabs: {
      /**
       * Query for tabs
       * @param {Object} queryInfo - Query parameters
       * @returns {Promise} Promise resolving with matching tabs
       */
      query: (queryInfo) => {
        if (isFirefox) {
          return api.tabs.query(queryInfo);
        } else {
          return chromeAPIAsPromise(api.tabs, 'query', queryInfo);
        }
      },

      /**
       * Send a message to a specific tab
       * @param {number} tabId - ID of tab to send message to
       * @param {Object} message - Message to send
       * @returns {Promise} Promise resolving with the response
       */
      sendMessage: (tabId, message) => {
        if (isFirefox) {
          return api.tabs.sendMessage(tabId, message);
        } else {
          return chromeAPIAsPromise(api.tabs, 'sendMessage', tabId, message);
        }
      }
    }
  };
})();

// Expose the API globally so content scripts can use it
window.browserAPI = browserAPI; 