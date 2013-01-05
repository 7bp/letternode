"use strict";

var Q = require('q'), fs = require('fs');

var Words = (function() {

  function Words(options) {
    options = options || {};
    if (!options.fileNameChars) {
      options.fileNameChars = 1;
    }
    if (!options.fileSuffix) {
      options.fileSuffix = '.txt';
    }
    if (!options.basePath) {
      options.basePath = './';
    }
    options.useCache = options.useCache === true;
    this.options = options;
    this.cachedWords = [];
    this.readyDeferred = Q.defer();
    this.readyPromise = this.readyDeferred.promise;
    this.initialize();
  }

  // Internal helper
  function getAllCharsAsArray() {
    var chars = [];
    for (var i = 97; i < 123; i++) {
      chars.push(String.fromCharCode(i));
    }
    return chars;
  }

  // Internal helper: Builds up an array with all base names, e.g. [aa, ab, ac, ...]
  function buildFileBaseNamesWithChars(fileNameChars) {
    var chars = getAllCharsAsArray();
    var result = [], i, c, j, d;

    for (i = 0, c = chars.length; i < c; i++) {
      result.push(chars[i]);
    }

    var requiredDepth = fileNameChars - 1;
    while (requiredDepth > 0) {
      var result2 = [];
      for (j = 0, d = result.length; j < d; j++) {
        for (i = 0, c = chars.length; i < c; i++) {
          result2.push(result[j] + chars[i]);
        }
      }
      result = result2;
      requiredDepth--;
    }

    return result;
  }

  // Internal helper: Returns the full (relative or absolute) path of a dictionary file.
  var buildFilePath = function(fileBaseName, options) {
    var result = options.basePath + '/' + fileBaseName + options.fileSuffix;
    // console.log(result);
    return result;
  };

  var readFile = function(filePath) {
    var readFile = Q.nfbind(fs.readFile);
    return readFile(filePath, 'utf8');
  };

  var stringToArrayList = function(data) {
    var words = data.split('\n'), word, result = [];
    for (var i = 0, c = words.length; i < c; i++) {
      word = words[i];
      if (word) {
        result.push(word);
      }
    }
    return result;
  };

  Words.prototype.initialize = function() {
    var me = this;

    me.readyPromise.then(function() {
      console.log('Pre loaded ' + me.cachedWords.length + ' words from dictionary (options.useCache = ' + me.options.useCache === true + '.');
    });

    if (me.options.useCache) {
      var fileBaseNames = buildFileBaseNamesWithChars(me.options.fileNameChars), promises = [], i, c;
      var onSuccess = function(data) {
        var words = stringToArrayList(data), word;
        for (var i = 0, c = words.length; i < c; i++) {
          word = words[i];
          me.cachedWords.push(word);
        }
      }, onFailure = function(err) {
        console.error('Could not find text file: ', err);
      };
      for (i = 0, c = fileBaseNames.length; i < c; i++) {
        var promise = readFile(buildFilePath(fileBaseNames[i], me.options));
        promise.then(onSuccess, onFailure);
        promises.push(promise);
      }
      // Dispatch the readiness when all promises are resolved regardless with success or error.
      Q.allResolved(promises).then(me.readyDeferred.resolve, me.readyDeferred.reject);
    } else {
      me.readyDeferred.resolve();
    }
  };

  Words.prototype.onReady = function(callback) {
    this.readyPromise.then(callback);
  };

  Words.prototype.existWord = function(word) {
    var me = this, deferred = Q.defer();
    word = word.toLowerCase();
    // Ensure that the access to cached data happens after all data are actually read.
    if (me.options.useCache && me.readyPromise.isResolved()) {
      var validWord = me.cachedWords.indexOf(word) > -1;
      if (validWord) {
        deferred.resolve();
      } else {
        deferred.reject();
      }
    } else {
      var firstChars = word.slice(0, me.options.fileNameChars);
      var onSuccess = function(words) {
        var validWord = words.indexOf(word) > -1;
        if (validWord) {
          deferred.resolve();
        } else {
          deferred.reject();
        }
      }, onFailure = function(err) {
        console.error('Could not find text file: ', err);
        deferred.reject();
      };
      readFile(buildFilePath(firstChars, me.options)).then(stringToArrayList, onFailure).then(onSuccess, onFailure);
    }

    return deferred.promise;
  };

  Words.loadDictionary = function(options) {
    options = options || {};
    return new Words(options);
  };

  return Words;
})();

module.exports = Words;