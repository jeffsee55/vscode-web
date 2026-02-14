var fs = require("fs");
const fse = require("fs-extra");
const child_process = require("child_process");

if (fs.existsSync("./demo/static")) {
  fs.rmdirSync("./demo/static", { recursive: true });
}

fs.mkdirSync("./demo/static", { recursive: true });

if (fs.existsSync("./dist/extensions")) {
  fse.copySync("./dist/extensions", "./demo/static/extensions");
}
if (fs.existsSync("./dist/node_modules")) {
  fse.copySync("./dist/node_modules", "./demo/static/node_modules");
}
if (fs.existsSync("./dist/out")) {
  fse.copySync("./dist/out", "./demo/static/out");
}

const webPlaygroundPath = './demo/static/extensions/vscode-web-playground';
if (fs.existsSync("./dist/extensions")) {
  fs.mkdirSync(webPlaygroundPath, { recursive: true });
  child_process.execSync(`git clone https://github.com/microsoft/vscode-web-playground.git ${webPlaygroundPath}`, { stdio: 'inherit' });
}

