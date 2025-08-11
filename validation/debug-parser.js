import { readFileSync } from 'fs';

// Simple test of the parsing logic
const content = readFileSync('specs/User.concept', 'utf-8');
const lines = content.split('\n');

console.log('=== User.concept Analysis ===');
console.log('Total lines:', lines.length);

console.log('\n=== Raw lines (first 20) ===');
lines.slice(0, 20).forEach((line, i) => {
  console.log(`${String(i+1).padStart(2)}: "${line}"`);
});

console.log('\n=== After trimming (first 20) ===');
const trimmedLines = lines.map(line => line.trim());
trimmedLines.slice(0, 20).forEach((line, i) => {
  console.log(`${String(i+1).padStart(2)}: "${line}"`);
});

console.log('\n=== Entity matches ===');
let currentSection = '';
trimmedLines.forEach((line, i) => {
  if (line === 'state') {
    currentSection = 'state';
    console.log(`Line ${i+1}: Found state section`);
    return;
  }
  if (line === 'actions') {
    currentSection = 'actions';
    return;
  }
  
  if (currentSection === 'state' && line && !line.startsWith(' ') && !line.includes(':') && !line.startsWith('#') && !line.startsWith('//') && /^[A-Za-z_][A-Za-z0-9_]*$/.test(line)) {
    console.log(`Line ${i+1}: ENTITY FOUND - "${line}"`);
  }
});

console.log('\n=== Field matches ===');
currentSection = '';
let currentEntity = '';
trimmedLines.forEach((line, i) => {
  if (line === 'state') {
    currentSection = 'state';
    return;
  }
  if (line === 'actions') {
    currentSection = 'actions';
    return;
  }
  
  if (currentSection === 'state' && line && !line.startsWith(' ') && !line.includes(':') && !line.startsWith('#') && !line.startsWith('//') && /^[A-Za-z_][A-Za-z0-9_]*$/.test(line)) {
    currentEntity = line;
  }
  
  // Check original line before trimming for field detection
  const originalLine = lines[i];
  if (currentSection === 'state' && originalLine.startsWith('    ') && currentEntity && originalLine.includes(':')) {
    console.log(`Line ${i+1}: FIELD FOUND for ${currentEntity} - "${originalLine.trim()}"`);
  }
});
