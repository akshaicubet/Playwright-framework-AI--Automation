#!/usr/bin/env node
/**
 * Prints a human-readable summary of utils/healing/healed-locators.json
 * Usage: npm run healed:review
 */
const fs = require('fs');
const path = require('path');

const mapPath = path.resolve(__dirname, '../utils/healing/healed-locators.json');

if (!fs.existsSync(mapPath)) {
  console.log('No healed-locators.json found — nothing has been healed yet.');
  process.exit(0);
}

const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
const entries = Object.entries(map);

if (entries.length === 0) {
  console.log('✅ healed-locators.json is empty — no self-healing has occurred.');
  process.exit(0);
}

console.log(`⚠️  ${entries.length} locator(s) were self-healed at runtime:\n`);
for (const [key, info] of entries) {
  console.log(`- "${info.originalDescriptor || key}"`);
  if (info.specFile) console.log(`    Spec file    : ${info.specFile}`);
  if (info.testTitle) console.log(`    Test         : ${info.testTitle}`);
  console.log(`    New selector : page.${info.newSelector}`);
  console.log(`    Matched on   : ${info.matchedOn}`);
  console.log(`    Tier         : ${info.tier} ${info.tier === 2 ? '(AI fallback — verify carefully)' : '(deterministic fuzzy match)'}`);
  console.log(`    Healed at    : ${info.healedAt}`);
  console.log('');
}
console.log('Run the healer-agent (/heal-apply in Claude Code) to promote these into permanent spec fixes.');
