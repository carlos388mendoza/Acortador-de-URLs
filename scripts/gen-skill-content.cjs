const fs = require('fs')
const content = fs.readFileSync('skills/acortador-urls/SKILL.md', 'utf8')
const escaped = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
const out = "export const SKILL_CONTENT = `" + escaped + "`\n"
fs.writeFileSync('src/lib/skill-content.ts', out)
console.log('written', out.length)
