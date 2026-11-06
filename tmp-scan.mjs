import { readFileSync, writeFileSync } from 'node:fs'
const L = readFileSync('src/plugin.js', 'utf8').split('\n')
const needles = process.argv.slice(2)
const out = []
for (let i = 0; i < L.length; i++) {
  for (const n of needles) if (L[i].includes(n)) out.push(`${i + 1}: ${L[i].trim()}`)
}
writeFileSync('scan.txt', out.join('\n') + '\n')
console.log('scanned', needles.length, 'needles ->', out.length, 'hits')
