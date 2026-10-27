const fs = require('fs');
const b = String.fromCharCode(96);
const s = String.fromCharCode(92);

// Helper to build template literal string
const tl = (...parts) => b + parts.join('') + b;

// Build the file content
let out = [];
out.push("import { bindInternalLinks, escapeHtml, layout } from '../../src/ui.js';");
out.push('');
out.push("const META_AI_PROMPT =");
