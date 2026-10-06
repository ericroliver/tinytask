// Guard for SEA build scripts (sea:linux / sea:macos / sea:windows).
//
// Single Executable Application support (`--experimental-sea-config`,
// postject injection) requires Node >= 20. Running these scripts under an
// older node (e.g. the 18.x that some pod images have as /usr/bin/node)
// fails with `node: bad option: --experimental-sea-config` — or worse,
// succeeds silently and ships a binary built on the wrong runtime.
//
// Exit fast with actionable guidance instead.
const [major, minor] = process.versions.node.split('.').map(Number);

if (major < 20) {
  console.error(
    `\ntinytask-cli SEA build requires Node >= 20.12 (found ${process.versions.node}).\n` +
      `Put a Node 20+ binary first on PATH and re-run, e.g.:\n\n` +
      `  export PATH=/enigma-home/.local/node-v20.19.2-linux-arm64/bin:\$PATH\n` +
      `  npm run sea:linux\n`
  );
  process.exit(1);
}

if (major === 20 && minor < 12) {
  console.error(
    `\ntinytask-cli SEA build requires Node >= 20.12 (found ${process.versions.node});\n` +
      `earlier 20.x lacks the postject-based SEA layout this config relies on.\n`
  );
  process.exit(1);
}
