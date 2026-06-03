#!/usr/bin/env node
/**
 * Direct Stitch MCP integration: push showcase runner cards as screen designs.
 * 
 * Requires valid Stitch API key. Run:
 *   export STITCH_API_KEY="your-key"
 *   npx tsx scripts/push-cards-to-stitch.ts --legend tom
 */

import { stitch } from '@google/stitch-sdk';
import { getTomEnvelope } from '../mobile/src/data/tomLegend';

async function pushCardToStitch(card: any, projectName: string) {
  const prompt = `
Create a mobile screen for T1D Companion.

Screen: ${card.title} (${card.kind})
Source: ${projectName}
Confidence: ${card.confidenceTier || 'unknown'}

Design Style: Clinical Clarity - medical blue (#004583), Manrope font, 8px grid, 12px rounded corners

Content:
${JSON.stringify(card.payload, null, 2)}

Educational simulator. No dosing or treatment recommendations.
  `.trim();

  console.log(`\n📤 Pushing "${card.title}" to Stitch...`);
  
  try {
    // Note: This requires valid OAuth/API key
    // The stitch SDK callTool would be:
    // const result = await stitch.callTool("generate_screen_from_text", {
    //   projectId: "3768458435933006236",
    //   prompt,
    //   modelId: "GEMINI_3_1_PRO"
    // });
    // console.log('   Screen created:', result.name);
  } catch (e) {
    console.log('   ⚠ Stitch auth may have expired - see error:', (e as Error).message.substring(0, 100));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const legend = args.includes('--legend') ? args[args.indexOf('--legend') + 1] : 'tom';
  const question = args.includes('--question') ? args[args.indexOf('--question') + 1] : 'breakfast routine';

  console.log('📲 Showcase Runner Cards → Stitch Design Flow');
  console.log('═════════════════════════════════════════════\n');

  const envelope = getTomEnvelope(question, 'breakfast');
  const projectName = 'T1D Companion Mobile v2';

  console.log(`📊 Envelope from: ${envelope.sourceLabel}`);
  console.log(`   Question: "${question}"`);
  console.log(`   Cards: ${envelope.cards?.length}\n`);

  // Show what would be pushed to each Stitch screen
  console.log('📋 Card mapping to Stitch screens:\n');
  
  envelope.cards?.forEach((card, i) => {
    console.log(`   ${i + 1}. ${card.kind.toUpperCase()}`);
    console.log(`      Title: ${card.title}`);
    console.log(`      Summary: ${card.summary?.substring(0, 60)}...`);
    console.log(`      Confidence: ${card.confidenceTier}`);
    console.log('');
  });

  console.log('🔧 Alternative: Manual Stitch workflow');
  console.log('   1. Open: https://stitch.withgoogle.com/projects/3768458435933006236');
  console.log('   2. For each card above, use prompt:');
  console.log(`      "Create a ${envelope.cards?.[0].kind} screen for T1D app showing ${envelope.cards?.[0].title}, use Clinical Clarity theme"`);
  console.log('   3. Apply design system after generation');
  console.log('\n🚀 React review: cd mobile && npx expo start --web');
  console.log('   Open localhost:8081 to see connected screens\n');

  // Output the full envelope for debugging
  console.log('📦 Full envelope JSON (copy for Stitch API):');
  console.log(JSON.stringify(envelope, null, 2));
}

main().catch(console.error);