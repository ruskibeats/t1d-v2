#!/usr/bin/env node
/**
 * Push showcase runner output to Stitch for design, then wire back to React.
 * 
 * Usage:
 *   npx tsx scripts/push-to-stitch.ts --legend tom --question "pizza and salad for dinner"
 *   npx tsx scripts/push-to-stitch.ts --all-cards  # Push all card types
 */

import { stitch } from '@google/stitch-sdk';
import { generateTomEnvelope } from '../mobile/src/data/tomLegend';

async function main() {
  const args = process.argv.slice(2);
  const isAllCards = args.includes('--all-cards');
  const legendArg = args.find(a => a === '--legend' && args[args.indexOf(a) + 1]);
  const legend = legendArg ? args[args.indexOf(legendArg) + 1] : 'tom';
  const questionArg = args.find(a => a === '--question' && args[args.indexOf(a) + 1]);
  const question = questionArg ? args[args.indexOf(questionArg) + 1] : 'breakfast routine';

  console.log('🎨 T1D Companion → Stitch Design Workflow');
  console.log('═══════════════════════════════════════════\n');

  // 1. Generate envelope from legend data
  const envelope = legend === 'tom' 
    ? generateTomEnvelope(question, 'breakfast')
    : generateTomEnvelope(question, 'breakfast');

  console.log(`📊 Generated forecast for: ${envelope.sourceLabel}`);
  console.log(`   Cards: ${envelope.cards?.length}`);
  envelope.cards?.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.kind}: ${c.title}`);
  });

  // 2. Stitch project info
  console.log('\n🔗 Stitch Design Project:');
  console.log('   https://stitch.withgoogle.com/projects/3768458435933006236');
  console.log('   (Open in browser to see/edit designs)\n');

  // 3. Mobile app location
  console.log('📱 React Native Integration:');
  console.log('   mobile/src/data/tomLegend.ts - Legend data source');
  console.log('   mobile/src/state/useLegendProfile.ts - Profile selection');
  console.log('   mobile/app/(tabs)/log-meal.tsx - Log meal screen');
  console.log('   mobile/app/(tabs)/home.tsx - Today dashboard');
  console.log('   mobile/app/(tabs)/patterns.tsx - Patterns & insights\n');

  // 4. Development server command
  console.log('🚀 Start dev server:');
  console.log('   cd mobile && npm start');
  console.log('   Then run: npx expo run:ios (or expo run:android)\n');
  console.log('   Or with web: cd mobile && npx expo start --web');
  console.log('   Open localhost:8081 to review\n');
}

main().catch(console.error);