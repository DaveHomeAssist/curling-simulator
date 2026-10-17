// Export only public schematic scene geometry from the existing FMP camera simulator.
// Usage: node scripts/export-horseshoes-venue.mjs /path/to/apps/fmp-camera-sim
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { writeFile, unlink } from 'node:fs/promises';
const source = resolve(process.argv[2]);
const temporary = resolve('.horseshoes-venue-export.cjs');
const entry = `
import { Group, Mesh, BoxGeometry, MeshLambertMaterial } from 'three';
import { defaultVenueProfile, deriveVenueGeometry } from '${source}/src/domain/venue.ts';
import { defaultShowPackage } from '${source}/src/domain/structures.ts';
import { buildTerrain } from '${source}/src/render/terrainBuilder.ts';
import { buildStructures } from '${source}/src/render/structureBuilder.ts';
import { buildBowl } from '${source}/src/render/bowlBuilder.ts';
const result=deriveVenueGeometry(defaultVenueProfile());
if(!result.ok) throw new Error('Invalid source venue');
const g=result.geometry, terrain=buildTerrain(g,false);
const root=new Group(); root.name='FMP lawn setting';
root.add(terrain.root,buildStructures(g,defaultShowPackage(),false).root,buildBowl(g.bowl,g.pitDepth,g.deckHeight,false,g.structures.fixtures).root);
const deck=new Mesh(new BoxGeometry(g.stageWidth,g.deckHeight,g.stageDepth),new MeshLambertMaterial({color:0x30363b}));
deck.position.set(0,-g.deckHeight/2,-g.stageDepth/2);root.add(deck);
const anchorZ=g.structures.shell.rearDownstage.value+g.terrain.concourseWidth.value+24;
const anchorY=terrain.surfaceHeightAt(0,-anchorZ);
if(anchorY===null) throw new Error('Court anchor is outside the lawn');
root.rotation.y=Math.PI;root.position.set(0,-anchorY,anchorZ+6);
const ground=terrain.root.getObjectByName('lawn-surface'), positions=ground.geometry.attributes.position;
for(let i=0;i<positions.count;i++) {
 const x=-positions.getX(i), z=anchorZ+6-positions.getZ(i);
 const edge=Math.max(Math.abs(x)/6,Math.abs(z-6)/17);
 if(edge<1.5) { const blend=Math.min(1,Math.max(0,(edge-1)/0.5));positions.setY(i,anchorY-0.03+(positions.getY(i)-anchorY+0.03)*blend); }
}
ground.geometry.computeVertexNormals();
root.traverse(o=>{o.layers.set(0);o.userData={};});
root.updateMatrixWorld(true);
module.exports=root.toJSON();
`;
try {
 await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',outfile:temporary,external:['three','three/*']});
 const {default:data}=await import(temporary);
 await writeFile('src/horseshoes/assets/fmp-venue.json',JSON.stringify(data, (_, value) => typeof value === 'number' && !Number.isInteger(value) ? Number(value.toFixed(5)) : value));
 console.log('Exported decorative FMP venue; game court remains independent.');
} finally { await unlink(temporary).catch(()=>{}); }
