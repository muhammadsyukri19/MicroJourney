// Membuat USDZ untuk Quick Look di iPhone dari setiap GLB di satu folder.
// Jalankan dari root repo: node scripts/export-microplastic-usdz.mjs public/models/microplastic
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const load = path => import(pathToFileURL(resolve('node_modules/three', path)).href);
const { GLTFLoader } = await load('examples/jsm/loaders/GLTFLoader.js');
const { USDZExporter } = await load('examples/jsm/exporters/USDZExporter.js');
const { unzipSync, strFromU8 } = await load('examples/jsm/libs/fflate.module.js');

const directory = process.argv[2];
for (const file of readdirSync(directory).filter(name => name.endsWith('.glb'))) {
  const bytes = readFileSync(join(directory, file));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new Promise((done, fail) => new GLTFLoader().parse(arrayBuffer, '', done, fail));
  gltf.scene.updateMatrixWorld(true);
  const usdz = await new USDZExporter().parseAsync(gltf.scene, {
    ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'horizontal' } },
    includeAnchoringProperties: true,
    quickLookCompatible: true,
  });
  const target = join(directory, file.replace(/\.glb$/, '.usdz'));
  writeFileSync(target, usdz);
  const entries = unzipSync(usdz);
  const main = strFromU8(entries['model.usda']);
  const opacity = [...new Set(main.match(/float inputs:opacity = [\d.]+/g) || [])];
  console.log(`${target}: ${(usdz.length / 1024).toFixed(0)} KB, ${Object.keys(entries).length - 1} geometri, ${main.match(/def Material/g)?.length ?? 0} bahan, jangkar ${main.match(/preliminary:anchoring:type = "(\w+)"/)?.[1]}, ${opacity.join(' ')}`);
}
