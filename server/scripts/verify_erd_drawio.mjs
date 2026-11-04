import fs from 'fs';

const xml = fs.readFileSync('AlumniTracker_ERD.drawio', 'utf8');

console.log('XML length:', xml.length);
if (!xml.startsWith('<?xml') || !xml.includes('</mxfile>')) {
  console.error('Invalid XML root structure!');
  process.exit(1);
} else {
  console.log('Valid XML root structure.');
}

// Check colored hex codes
const colorMatches = xml.match(/#[0-9a-fA-F]{6}/g) || [];
const uniqueColors = [...new Set(colorMatches.map(c => c.toLowerCase()))];
console.log('Unique hex colors used:', uniqueColors);

// Check that all colors are strictly monochrome/grayscale (r === g && g === b)
const isGrayscale = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r === g && g === b;
};

const nonGrayscale = uniqueColors.filter(c => !isGrayscale(c));
if (nonGrayscale.length > 0) {
  console.error('NON-GRAYSCALE COLORS FOUND:', nonGrayscale);
  process.exit(1);
} else {
  console.log('PASS: ALL colors are 100% pure monochrome / grayscale!');
}

// Check count of entity cells
const entityCells = xml.match(/id="ent_[^"]+"/g) || [];
console.log('Entity cells count:', entityCells.length);

// Check count of edges
const edgeCells = xml.match(/id="edge_[^"]+"/g) || [];
console.log('Edge cells count:', edgeCells.length);

// Check strong vs weak entities
const weakEntities = xml.match(/double=1/g) || [];
const strongEntities = xml.match(/double=0/g) || [];
console.log('Weak entities (double=1):', weakEntities.length);
console.log('Strong entities (double=0):', strongEntities.length);

// Check strong vs weak relationships
const dashedEdges = xml.match(/dashed=1/g) || [];
const solidEdges = xml.match(/dashed=0/g) || [];
console.log('Weak edges (dashed=1):', dashedEdges.length);
console.log('Strong edges (dashed=0):', solidEdges.length);

console.log('All verification checks passed successfully!');

