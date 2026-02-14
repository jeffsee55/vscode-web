const process = require("process");
const child_process = require("child_process");
const fs = require("fs");
const fse = require("fs-extra");
const { version } = require("./package.json");

const vscodeVersion = version.split("-")[0];

function error(msg) {
  console.info("\x1b[31merror %s\x1b[0m", msg);
}
function ok(msg) {
  console.info("\x1b[32m%s\x1b[0m", msg);
}
function note(msg) {
  console.info("\x1b[90m%s\x1b[0m", msg);
}
function exec(cmd, opts) {
  console.info("\x1b[36m%s\x1b[0m", cmd);
  return child_process.execSync(cmd, opts);
}

const requiredTools = ["node", "yarn", "git", "python"];
note(`required tools ${JSON.stringify(requiredTools)}`);
for (const tool of requiredTools) {
  try {
    child_process.execSync(`${tool} --version`, { stdio: "ignore" });
  } catch (e) {
    error(`"${tool}" is not available.`);
    process.exit(1);
  }
}
ok("required tools installed");

const node_version_out = child_process.execSync(`node -v`);
const node_version = node_version_out.toString().trim();
const nodeMajor = parseInt(node_version.slice(1).split(".")[0], 10);
if (nodeMajor < 20) {
  error(`Need Node 20 or higher. Got "${node_version}"`);
  process.exit(1);
}
if (nodeMajor > 22) {
  error(`VS Code build expects Node 20–22 (see vscode/.nvmrc). Node 24+ breaks native addons (e.g. tree-sitter). Got "${node_version}". Use: nvm install 22 && nvm use 22`);
  process.exit(1);
}

if (!fs.existsSync("vscode")) {
  note("cloning vscode");
  exec(
    `git clone --depth 1 https://github.com/microsoft/vscode.git -b ${vscodeVersion}`,
    {
      stdio: "inherit",
    }
  );
} else {
  ok("vscode already installed");
  note("delete vscode folder to clone again");
}

note("changing directory to vscode");
process.chdir("vscode");

if (!fs.existsSync("node_modules")) {
  note("installing dependencies (npm)");
  exec("npm ci", {
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_SKIP_BINARY_DOWNLOAD: 1,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: 1,
    },
  });
} else {
  ok("node_modules exists. Skipping npm ci");
}

// Ensure upstream workbench is used (restore if it was patched in a previous run).
note("restoring upstream workbench.ts");
exec("git checkout src/vs/code/browser/workbench/workbench.ts", { stdio: "inherit" });

// Temporarily add codeWeb entry point so the build produces workbench.js (demo bootstrap).
// We patch the gulpfile here instead of in the vscode repo so the submodule stays clean.
const gulpfilePath = "build/gulpfile.vscode.web.ts";
let gulpfilePatched = false;
if (fs.existsSync(gulpfilePath)) {
  let content = fs.readFileSync(gulpfilePath, "utf8");
  const marker = "buildfile.workbenchWeb,\n].flat();";
  if (content.includes(marker) && !content.includes("buildfile.codeWeb")) {
    content = content.replace(marker, "buildfile.workbenchWeb,\n\tbuildfile.codeWeb,\n].flat();");
    fs.writeFileSync(gulpfilePath, content);
    gulpfilePatched = true;
    note("patched gulpfile.vscode.web.ts to add codeWeb entry point");
  }
}

// Compile
note("starting compile");
exec("npm run gulp -- vscode-web-min", { stdio: "inherit" });
ok("compile completed");

if (gulpfilePatched) {
  note("restoring gulpfile.vscode.web.ts");
  exec("git checkout build/gulpfile.vscode.web.ts", { stdio: "inherit" });
}

// Extract compiled files
if (fs.existsSync("../dist")) {
  note("cleaning ../dist");
  fs.rmdirSync("../dist", { recursive: true });
} else {
  ok("../dist did not exist. No need to clean");
}

fs.mkdirSync("../dist");
fse.copySync("../vscode-web", "../dist");
ok("copied ../vscode-web to ../dist");
