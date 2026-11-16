#!/usr/bin/env node
/**
 * Resets utils/healing/healed-locators.json to an empty map.
 * Usage: npm run healed:clear
 */
const fs = require('fs');
const path = require('path');

const mapPath = path.resolve(__dirname, '../utils/healing/healed-locators.json');
fs.writeFileSync(mapPath, '{}\n', 'utf-8');
console.log('✅ healed-locators.json cleared.');
