/**
 * What the structure generator actually produced.
 *
 * A structure that does not appear on screen has failed either in the geometry
 * or in the shader, and those are very different problems. This answers the
 * first half in a second: how many points each space got, and how they were
 * shared out between the parts of it.
 *
 *   node tools/census.mjs [budget]
 */
import { build } from 'esbuild';

const budget = Number(process.argv[2] ?? 4400);

const result = await build({
  entryPoints: ['network/structures.ts'],
  bundle: true,
  format: 'esm',
  write: false,
  target: ['es2020'],
});

const source = result.outputFiles[0].text;
const module_ = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
);

const buffers = module_.buildStructures(budget);
const spaces = new Map();

for (let i = 0; i < buffers.count; i++) {
  const space = buffers.index[i * 2];
  const role = buffers.param[i * 4 + 1];
  if (!spaces.has(space)) spaces.set(space, new Map());
  const roles = spaces.get(space);
  const entry = roles.get(role) ?? { count: 0, min: [9, 9, 9], max: [-9, -9, -9] };
  entry.count++;
  for (let axis = 0; axis < 3; axis++) {
    const v = buffers.position[i * 3 + axis];
    if (v < entry.min[axis]) entry.min[axis] = v;
    if (v > entry.max[axis]) entry.max[axis] = v;
  }
  roles.set(role, entry);
}

console.log(`budget ${budget} -> ${buffers.count} points`);
for (const [space, roles] of [...spaces].sort((a, b) => a[0] - b[0])) {
  const total = [...roles.values()].reduce((a, b) => a + b.count, 0);
  console.log(`  space ${space}  ${String(total).padStart(5)} points`);
  for (const [role, entry] of [...roles].sort((a, b) => a[0] - b[0])) {
    const extent = entry.max.map((v, i) => (v - entry.min[i]).toFixed(2)).join(' x ');
    console.log(`    role ${role}  ${String(entry.count).padStart(5)}   extent ${extent}`);
  }
}
