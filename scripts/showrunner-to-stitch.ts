#!/usr/bin/env node
/**
 * Push showcase runner cards directly to Stitch for design iteration.
 * 
 * Workflow:
 *   1. Generate companion cards from CLI runner
 *   2. Format as Stitch design prompt
 *   3. Use Stitch MCP to generate/update screen
 * 
 * Usage:
 *   npx tsx scripts/showrunner-to-stitch.ts --legend tom --question "pizza and salad for dinner"
 *   npx tsx scripts/showrunner-to-stitch.ts --all-cards
 */

import { stitch } from '@google/stitch-sdk';
import { generateTomEnvelope } from '../mobile/src/data/tomLegend';

// Card type definitions matching CLI runner
const CARD_TEMPLATES = {
  forecast: {
    title: "Expected glucose shape",
    description: "Shows baseline, peak, timing, and uncertainty range for the meal"
  },
  parsedFoods: {
    title: "Parsed foods",
    description: "List of foods extracted from meal description with confidence indicators"
  },
  foodEvidence: {
    title: "Food evidence",
    description: "Nutritional breakdown with warnings and uncertainty notes"
  },
  mealMemory: {
    title: "Meal memory",
    description: "Historical context from similar meals and outcomes"
  },
  confidence: {
    title: "Confidence",
    description: "Data quality breakdown with component scores"
  },
  whatIfScenarios: {
    title: "What-if scenarios",
    description: "Alternative portion/timing options with predicted outcomes"
  },
  monitoring: {
    title: "Monitoring",
    description: "Observation windows and alerts for the forecast period"
  },
  patternGenome: {
    title: "Pattern genome",
    description: "Recurring traits and trigger foods analysis"
  },
  troubleshoot: {
    title: "Troubleshoot",
    description: "Educational checklist for high/low episodes"
  },
  situation: {
    title: "Situation guide",
    description: "Context-specific guidance for exercise, illness, alcohol"
  },
  debrief: {
    title: "Daily debrief",
    description: "End-of-day summary with patterns and tomorrow watch-outs"
  }
};

async function generateStitchDesign(envelope: any, cardKind: string) {
  // Format the envelope as a design prompt for Stitch
  const cardData = envelope.cards?.find((c: any) => c.kind === cardKind || c.id?.includes(cardKind));
  if (!cardData) return null;

  const prompt = `
Design a mobile screen for T1D Companion app.

Screen Type: ${cardKind} - ${CARD_TEMPLATES[cardKind as keyof typeof CARD_TEMPLATES]?.title || 'Unknown'}
Description: ${CARD_TEMPLATES[cardKind as keyof typeof CARD_TEMPLATES]?.description || ''}

Design System:
- Theme: Clinical Clarity
- Colors: Primary #004583, Secondary #1b6d24, Manrope font
- Corners: 0.5rem (8px) rounded
- Spacing: 8px grid system

Screen Content:
${JSON.stringify(cardData.payload, null, 2)}

Source Label: ${envelope.sourceLabel}
Confidence: ${cardData.confidenceTier || 'unknown'}

This is for a Type 1 Diabetes companion app. Medical-grade design, accessibility-focused, educational simulation only.
  `.trim();

  console.log(`\n📝 Generated Stitch prompt for ${cardKind} screen:\n`);
  console.log(prompt);
  
  // Could call Stitch MCP here to create/update screen
  // For now, print the prompt to use in Stitch prompt bar
  console.log(`\n\n💡 To create in Stitch:`);
  console.log(`   1. Open https://stitch.withgoogle.com/projects/3768458435933006236`);
  console.log(`   2. Paste the prompt above into the Stitch prompt bar`);
  console.log(`   3. Generate screen, then apply design system: Clinical Clarity`);

  return prompt;
}

async function main() {
  const args = process.argv.slice(2);
  const isAllCards = args.includes('--all-cards');
  const question = args.find(a => a === '--question') 
    ? args[args.indexOf('--question') + 1] 
    : 'breakfast routine';

  console.log('🚀 Showcase Runner → Stitch Design Pipeline');
  console.log('═══════════════════════════════════════════\n');

  // Get Tom's envelope
  const envelope = generateTomEnvelope(question, 'breakfast');
  
  console.log(`📊 Source: ${envelope.sourceLabel}`);
  console.log(`   Cards in envelope: ${envelope.cards?.length}\n`);

  // Generate Stitch prompts for each card
  const cards = ['forecast', 'parsedFoods', 'foodEvidence', 'mealMemory', 'confidence'];
  
  for (const cardKind of cards) {
    await generateStitchDesign(envelope, cardKind);
    console.log('\n─────────────────────────────────────────\n');
  }

  console.log('\n✅ All cards formatted for Stitch design!');
  console.log('   Run: npx expo start --web (localhost:8081) to view in React');
}

main().catch(console.error);