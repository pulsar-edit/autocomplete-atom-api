/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// Run this to update the static list of properties stored in the
// completions.json file at the root of this repository.

const fs = require('fs');
const request = require('request');

const requestOptions = {
  url: 'https://api.github.com/repos/atom/atom/releases/latest',
  json: true,
  headers: {
    'User-Agent': 'agent'
  }
};

request(requestOptions, function(error, response, release) {
  if (error != null) {
    console.error(error.message);
    return process.exit(1);
  }

  const apiAsset = release.assets.filter(({name}) => name === 'atom-api.json');

  if (!(apiAsset != null ? apiAsset.browser_download_url : undefined)) {
    console.error('No atom-api.json asset found in latest release');
    return process.exit(1);
  }

  const apiRequestOptions = {
    json: true,
    url: apiAsset.browser_download_url
  };

  request(apiRequestOptions, function(error, response, atomApi) {
    if (error != null) {
      console.error(error.message);
      return process.exit(1);
    }

    const classes = atomApi;

    const publicClasses = {};
    for (let name in classes) {
      const {instanceProperties, instanceMethods} = classes[name];
      const pluckPropertyAttributes = convertPropertyToSuggestion.bind(this, name);
      const pluckMethodAttributes = convertMethodToSuggestion.bind(this, name);
      const properties = instanceProperties.filter(isVisible).map(pluckPropertyAttributes).sort(textComparator);
      const methods = instanceMethods.filter(isVisible).map(pluckMethodAttributes).sort(textComparator);

      if (((properties != null ? properties.length : undefined) > 0) || (methods.length > 0)) {
        publicClasses[name] = properties.concat(methods);
      }
    }

    fs.writeFileSync('completions.json', JSON.stringify(publicClasses, null, '  '));
  });
});

const isVisible = ({visibility}) => ['Essential', 'Extended', 'Public'].includes(visibility);

const convertMethodToSuggestion = function(className, method) {
  const {name, summary, returnValues} = method;
  const args = method['arguments'];

  let snippets = [];
  if (args != null ? args.length : undefined) {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      snippets.push(`\${${i+1}:${arg.name}}`);
    }
  }

  let text = null;
  let snippet = null;
  if (snippets.length) {
    snippet = `${name}(${snippets.join(', ')})`;
  } else {
    text = `${name}()`;
  }

  const returnValue = returnValues?[0]?.type;
  const description = summary;
  const descriptionMoreURL = getDocLink(className, name);
  return {name, text, snippet, description, descriptionMoreURL, leftLabel: returnValue, type: 'method'};
};

const convertPropertyToSuggestion = function(className, {name, summary}) {
  const text = name;
  const returnValue = summary?.match(/\{(\w+)\}/)?[1];
  const description = summary;
  const descriptionMoreURL = getDocLink(className, name);
  return {name, text, description, descriptionMoreURL, leftLabel: returnValue, type: 'property'};
};

const getDocLink = (className, instanceName) => `https://atom.io/docs/api/latest/${className}#instance-${instanceName}`;

const textComparator = function(a, b) {
  if (a.name > b.name) { return 1; }
  if (a.name < b.name) { return -1; }
  return 0;
};
