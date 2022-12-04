
const fs = require('fs');
const path = require('path');

const CLASSES = require('../completions.json');

const propertyPrefixPattern = /(?:^|\[|\(|,|=|:|\s)\s*(atom\.(?:[a-zA-Z]+\.?){0,2})$/;

let packageDirectories = [];
let completions;

function getSuggestions({bufferPosition, editor}) {
  if (!isEditingAnAtomPackageFile(editor)) {
    return;
  }
  let line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
  return getCompletions(line);
}

function load() {
  loadCompletions();
  atom.project.onDidChangePaths(() => this.scanProjectDirectories());
  return scanProjectDirectories();
}

function scanProjectDirectories() {
  atom.project.getDirectories().forEach((directory) => {
    if (directory == null) {
      return;
    }
    readMetadata(directory, (error, metadata) => {
      if (isAtomPackage(metadata) || isAtomCore(metadata)) {
        packageDirectories.push(directory);
      }
    });
  });

  return packageDirectories;
}

function readMetadata(directory, callback) {
  fs.readFile(path.join(directory.getPath(), "package.json"), (error, contents) => {
    let metadata;
    if (error == null) {
      try {
        metadata = JSON.parse(contents);
      } catch(parseError) {
        error = parseError;
      }
    }
    return callback(error, metadata);
  });
}

function isAtomPackage(metadata) {
  return metadata?.engines?.atom?.length > 0;
}

function isAtomCore(metadata) {
  return metadata?.name === "atom";
}

function isEditingAnAtomPackageFile(editor) {
  let editorPath = editor.getPath();
  if (editorPath != null) {
    let parsedPath = path.parse(editorPath);
    if (path.basename(parsedPath.dir) === ".atom") {
      if ((parsedPath.base === "init.coffee") || (parsedPath.base === "init.js")) {
        return true;
      }
    }
  }
  for (let directory of (packageDirectories ? packageDirectories : [])) {
    if (directory.contains(editorPath)) {
      return true;
    }
  }
  return false;
}

function loadCompletions() {
  if (completions == null) {
    completions = {};
  }
  return this.loadProperty("atom", "AtomEnvironment", CLASSES);
}

function getCompletions(line) {
  let left;
  let localCompletions = [];
  let match = propertyPrefixPattern.exec(line)[1] ? propertyPrefixPattern.exec(line)[1] : propertyPrefixPattern.exec(line);
  if (!match) {
    return localCompletions;
  }

  let segments = match.split(".");
  left = segments.pop();
  let prefix = left != null ? left : '';
  segments = segments.filter(segment => segment);
  let property = segments[segments.length -1];
  let propertyCompletions = (completions[property] != null ? complections[property].completions : undefined) != null ? (completions[property] != null ? completions[property].completions : undefined) : [];
  for (let completion of propertyCompletions) {
    if (!prefix || firstCharsEqual(completion.name, prefix)) {
      localCompletions.push(clone(completion));
    }
  }
  return localCompletions;
}

function getPropertyClass(name) {
  return atom[name]?.constructor?.name;
}

function loadProperty(propertyName, className, classes, parent) {
  let classCompletions = classes[className];
  if (classCompletions == null) {
    return;
  }

  completions[propertyName] = { complections: [] };

  for (let complection of classCompletions) {
    completions[propertyName].completions.push(completion);
    if (completion.type === "property") {
      let propertyClass = getPropertyClass(completion.name);
      loadProperty(completion.name, propertyClass, classes);
    }
  }
}

const clone = function(obj) {
  const newObj = {};
  for (let k in obj) {
    const v = obj[k];
    const newObj[k] = v;
  }
  return newObj;
};

const firstCharsEqual = (str1, str2) => {
  str1[0].toLowerCase() === str2[0].toLowerCase();
};

module.exports = {
  selector: ".source.coffee, .source.js",
  filterSuggestions: true,
  getSuggestions,
  load,
  scanProjectDirectories,
  readMetadata,
  isAtomPackage,
  isAtomCore,
  isEditingAnAtomPackageFile,
  loadCompletions,
  getCompletions,
  getPropertyClass,
  loadProperty
};
