const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, 'CHANGELOG.md');
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('Usage: node add-changelog.js "your change message" [--type Added|Fixed|Changed|Removed]');
    process.exit(1);
}

let type = 'Added';
let message = '';

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
        type = args[i + 1].charAt(0).toUpperCase() + args[i + 1].slice(1);
        i++;
    } else {
        message = args[i];
    }
}

if (!fs.existsSync(changelogPath)) {
    console.error('CHANGELOG.md not found!');
    process.exit(1);
}

let content = fs.readFileSync(changelogPath, 'utf8');

const unreleasedMatch = content.match(/## \[Unreleased\]([\s\S]*?)(?=\n##|$)/);

if (!unreleasedMatch) {
    console.error('Could not find [Unreleased] section in CHANGELOG.md');
    process.exit(1);
}

let unreleasedSection = unreleasedMatch[1];
const typeHeader = `### ${type}`;

if (!unreleasedSection.includes(typeHeader)) {
    // Add type header if it doesn't exist
    unreleasedSection = unreleasedSection.trim() + `\n\n${typeHeader}\n- ${message}\n`;
} else {
    // Append to existing type section
    unreleasedSection = unreleasedSection.replace(typeHeader, `${typeHeader}\n- ${message}`);
}

const newContent = content.replace(unreleasedMatch[0], `## [Unreleased]${unreleasedSection}`);

fs.writeFileSync(changelogPath, newContent);
console.log(`✅ Added to CHANGELOG.md [${type}]: ${message}`);
