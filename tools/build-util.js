/* eslint-disable security/detect-child-process */
/* eslint-disable security/detect-non-literal-fs-filename */

const path = require('path');
const fs = require('fs');
const util = require('util');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const spawn = require('child_process').spawn;
const chalk = require('chalk');

exports.ROOT_DIR = path.normalize(path.join(__dirname, '..'));
exports.DIST_DIR = path.join(exports.ROOT_DIR, 'work/dist');
exports.ROOT_PACKAGE_JSON_FILE = path.join(exports.ROOT_DIR, 'package.json');
exports.DIST_PACKAGE_JSON_FILE = path.join(exports.DIST_DIR, 'package.json');

exports.exec = util.promisify(require('child_process').exec);
exports.spawn = async function (command, args, options) {
  const child = spawn.apply(this, arguments);
  if (!options.stdio) {
    options.stdio = 'inherit';
  }

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const commandLine = `${chalk.bold(command)} ${args.map((arg) => {
          return `${chalk.gray('"')}${chalk.reset.bold(arg)}${chalk.gray('"')}`;
        }).join(' ')}`;

        reject(new Error(`${chalk.reset(commandLine)} returned non-zero exit code`));
      }
    });
  });
};

exports.chalk = require('chalk');

exports.writeJsonFile = async (file, obj) => {
  return writeFile(file, JSON.stringify(obj, null, '  ') + '\n', { encoding: 'utf8' });
};

exports.readJsonFile = async (file) => {
  return JSON.parse(await readFile(file, {encoding: 'utf8'}));
};
