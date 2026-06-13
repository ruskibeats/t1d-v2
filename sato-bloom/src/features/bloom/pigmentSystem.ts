/**
 * SATO PIGMENT SYSTEM
 *
 * These colors are not labels.
 * They are metabolic pigments.
 *
 * Food, movement, rest and stress mix into watercolor stains.
 * The user should never see this reference chart directly.
 * It exists internally so the Bloom Engine can paint consistently.
 *
 * Imports the canonical contract from @workspace/shared — no local duplicate.
 */

import { SATO_PIGMENTS, pigmentForKey } from '@workspace/shared';
import type { MetabolicPigmentKey } from '@workspace/shared';

export type { MetabolicPigmentKey };
export { SATO_PIGMENTS, pigmentForKey };