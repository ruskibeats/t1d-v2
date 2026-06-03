#!/usr/bin/env node
/**
 * T1D Companion Complete User Journey
 * 
 * Terminal CLI → Stitch Design → React Native → localhost:8081
 * 
 * This script demonstrates the full end-to-end flow for the showcase runner.
 */

import { stitch } from '@google/stitch-sdk';
import { getTomEnvelope, tomLegend } from '../mobile/src/data/tomLegend';

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           T1D COMPANION COMPLETE USER JOURNEY                ║
╚══════════════════════════════════════════════════════════════════╝

🎯 GOAL: See how a meal input flows through CLI → Stitch → Mobile

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 1: Legend Profile
  console.log('1️⃣ LEGEND PROFILE: Tom Batchelor');
  console.log('   Anchor: Foot2Floor');
  console.log('   Known routine: 2 brown toast slices + 4 scrambled eggs + butter + avocado');
  console.log('   Current CGM: 108 mg/dL (stable)');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 2: Meal Input
  const mealText = 'breakfast routine';
  console.log(`2️⃣ MEAL INPUT: "${mealText}"`);
  
  // Step 3: Generate companion envelope
  const envelope = getTomEnvelope(mealText, 'breakfast');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 4: Show the 5-step pipeline
  console.log('3️⃣ PIPELINE CARDS (5 steps):');
  console.log('');
  
  envelope.cards?.forEach((card, i) => {
    const icon = {
      parsedFoods: '🍽️',
      foodEvidence: '🔬',
      forecast: '📈',
      mealMemory: '📚',
      confidence: '📊'
    }[card.kind] || '📄';
    
    console.log(`   ${i + 1}. ${icon} ${card.title.toUpperCase()}`);
    console.log(`      ${card.summary?.substring(0, 70)}...`);
    if (card.payload) {
      const payload = card.payload as any;
      if (payload.baselineMgDl) {
        console.log(`      Baseline: ${payload.baselineMgDl} → Peak: ${payload.peakMgDl} mg/dL`);
      } else if (payload.foods) {
        console.log(`      Foods: ${payload.foods.map((f: any) => f.item).join(', ')}`);
      }
    }
    console.log('');
  });

  // Step 5: Stitch integration
  console.log('4️⃣ STITCH DESIGN PROJECT:');
  console.log('   https://stitch.withgoogle.com/projects/3768458435933006236');
  console.log('   Screens created:');
  console.log('     • Meal Results - Parsed Foods (780×1768)');
  console.log('     • Food Evidence (780×1768)');
  console.log('     • Expected glucose shape (780×1768)');
  console.log('     • Meal Memory Details (780×1840)');
  console.log('     • Confidence Breakdown (780×1948)');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 6: React Native wiring
  console.log('5️⃣ REACT NATIVE SCREENS (localhost:8081):');
  console.log('   📱 Tabs: Today → Log Meal → Patterns → History');
  console.log('');
  console.log('   Tab 1: Today (home.tsx)');
  console.log('      - Tom\'s CGM display (108 mg/dL)');
  console.log('      - Food memory list');
  console.log('      - Quick action: "Log Meal" button');
  console.log('');
  console.log('   Tab 2: Log Meal (log-meal.tsx)');
  console.log('      - Known routine shown');
  console.log('      - "Save Meal" → generates forecast envelope');
  console.log('      - Profile selector: Tom Batchelor/Foot2Floor');
  console.log('');
  console.log('   Tab 3: Patterns (patterns.tsx)');
  console.log('      - Pattern genome');
  console.log('      - Trigger foods');
  console.log('');
  console.log('   Tab 4: History (meals.tsx)');
  console.log('      - Saved meal reviews');
  console.log('      - Forecast replay');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 7: How to run
  console.log('6️⃣ HOW TO RUN THE JOURNEY:');
  console.log('');
  console.log('   # Start mobile app');
  console.log('   cd mobile && npx expo start --web');
  console.log('');
  console.log('   # Then open in browser');
  console.log('   open http://localhost:8081');
  console.log('');
  console.log('   # Navigate:');
  console.log('   1. Tap "Log Meal" tab');
  console.log('   2. See Tom\'s known routine displayed');
  console.log('   3. Tap "Save Meal"');
  console.log('   4. See 5-card forecast pipeline');
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  // Step 8: Terminal CLI preview
  console.log('7️⃣ TERMINAL CLI EQUIVALENT:');
  console.log('   python3 src/cli.py --legend tom --question "breakfast routine"');
  console.log('   # Shows same cards in terminal format');
  console.log(`
══════════════════════════════════════════════════════════════════
`);
}

main().catch(console.error);