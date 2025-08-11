#!/usr/bin/env tsx

/**
 * Validation Engine Demo
 * 
 * Demonstrates the concept validation engine by analyzing the Team concept
 * and showing alignment between specification and implementation.
 */

import { validateProject } from './lib/engine/validation';

async function runDemo() {
  console.log('🚀 Concept Validation Engine Demo');
  console.log('====================================\n');
  
  try {
    // Run validation on the current project
    await validateProject('.', {
      includeAI: false, // Set to true if you have an OpenAI API key
      outputFormat: 'console'
    });
    
    console.log('\n✅ Demo completed successfully!');
    console.log('\n📚 To run with AI analysis:');
    console.log('   1. Set OPENAI_API_KEY environment variable');
    console.log('   2. Run: npm run validate:ai');
    console.log('\n📄 To generate HTML reports:');
    console.log('   npm run validate:html');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Check if this is the main module (ES module way)
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

// If this file is being run directly
if (process.argv[1] === __filename) {
  runDemo();
}
