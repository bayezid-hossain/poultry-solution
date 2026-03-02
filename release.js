const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

try {
    const appJsonPath = './app.json';
    const changelogPath = './CHANGELOG.md';
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    const currentVersion = appJson.expo.version;
    const parts = currentVersion.split('.');

    // Increment the patch version (e.g., 1.0.1 -> 1.0.2)
    parts[2] = parseInt(parts[2], 10) + 1;
    const newVersion = parts.join('.');

    // 1. Process CHANGELOG.md
    let releaseNotes = '';
    if (fs.existsSync(changelogPath)) {
        let changelog = fs.readFileSync(changelogPath, 'utf8');
        const unreleasedMatch = changelog.match(/## \[Unreleased\]([\s\S]*?)(?=\n## |$)/);

        if (unreleasedMatch && unreleasedMatch[1].trim()) {
            releaseNotes = unreleasedMatch[1].trim();
            const date = new Date().toISOString().split('T')[0];
            const versionHeader = `## [v${newVersion}] - ${date}`;

            // Replace [Unreleased] with versioned header and empty [Unreleased]
            changelog = changelog.replace(
                /## \[Unreleased\]/,
                `## [Unreleased]\n\n${versionHeader}`
            );
            fs.writeFileSync(changelogPath, changelog);
            console.log(`✅ Updated CHANGELOG.md with version v${newVersion}`);
        } else {
            console.warn('⚠️ No unreleased changes found in CHANGELOG.md. Proceeding without notes.');
        }
    }

    // 2. Update app.json
    appJson.expo.version = newVersion;
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
    console.log(`🚀 Bumped app.json version: ${currentVersion} -> ${newVersion}`);

    const commands = [
        `git add app.json CHANGELOG.md`,
        `git commit -m "chore: bump version to v${newVersion}${releaseNotes ? '\n\n' + releaseNotes : ''}"`,
        `git push origin main`,
        `git tag v${newVersion}`,
        `git push origin v${newVersion}`
    ];

    for (const cmd of commands) {
        console.log(`> ${cmd}`);
        execSync(cmd, { stdio: 'inherit' });
    }

    console.log(`\n✅ Successfully released v${newVersion}!`);
    console.log(`\n📋 RELEASE NOTES FOR GITHUB:\n\n${releaseNotes || 'Bug fixes and performance improvements.'}\n`);

} catch (error) {
    console.error(`\n❌ Release failed: ${error.message}\n`);
    process.exit(1);
}
