const provider = require('./provider.js');

module.exports = {
  activate: () => {
    return provider.load();
  },
  getProvider: () => {
    return provider;
  }
};
