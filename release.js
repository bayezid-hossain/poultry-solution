const fs = require('fs');
const { execSync } = require('child_process');

try {
    const appJsonPath = './app.json';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const currentVersion = appJson.expo.version;
    const parts = currentVersion.split('.');

    // Increment the patch version (e.g., 1.0.1 -> 1.0.2)
    parts[2] = parseInt(parts[2], 10) + 1;
    const newVersion = parts.join('.');

    appJson.expo.version = newVersion;

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

    console.log(`\n🚀 Bumped app.json version: ${currentVersion} -> ${newVersion}\n`);

    const commands = [
        `git add app.json`,
        `git commit -m "chore: bump version to v${newVersion}"`,
        `git push origin main`,
        `git tag v${newVersion}`,
        `git push origin v${newVersion}`
    ];

    for (const cmd of commands) {
        console.log(`> ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
    }

    console.log(`\n✅ Successfully released v${newVersion}! GitHub Actions will now build the APK.\n`);
} catch (error) {
    console.error(`\n❌ Release failed: ${error.message}\n`);
    process.exit(1);
}
