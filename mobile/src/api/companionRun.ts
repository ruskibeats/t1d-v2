import { postJson } from './client';
import { demoEnvelope } from '@/data/demoEnvelope';
import type { CompanionRunEnvelope, CompanionRunRequest } from '@/types/mobileCard';

export async function runCompanion(request: CompanionRunRequest): Promise<CompanionRunEnvelope> {
  if (request.text.trim().toLowerCase().includes('demo') || process.env.EXPO_PUBLIC_USE_DEMO_API === '1') {
    return demoEnvelope;
  }

  return postJson<CompanionRunEnvelope, CompanionRunRequest>('/mobile/companion/run', request);
}

export function getDemoEnvelope(): CompanionRunEnvelope {
  return demoEnvelope;
}
