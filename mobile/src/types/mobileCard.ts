export type SchemaVersion = '1.0';
export type CompanionPhase = 'preflight' | 'final';
export type DataMode = 'synthetic_demo' | 'real_user';
export type ConfidenceTier = 'high' | 'medium' | 'low' | 'unknown';
export type DataSource = 'real_cgm' | 'nightscout' | 'food_proxy' | 'synthetic_legend' | 'unknown';

export type CompanionMode =
  | 'meal'
  | 'what_if'
  | 'troubleshoot'
  | 'situation'
  | 'patterns'
  | 'debrief';

export type RouteRecommendation =
  | 'forecast_direct'
  | 'parsed_review'
  | 'clarification_required'
  | 'final_cards';

export type MobileCardKind =
  | 'forecast'
  | 'parsedFoods'
  | 'foodEvidence'
  | 'mealMemory'
  | 'confidence'
  | 'safetyStatus'
  | 'whatIfScenarios'
  | 'monitoring'
  | 'patternGenome'
  | 'troubleshoot'
  | 'situation'
  | 'checkIn'
  | 'insights'
  | 'clarification'
  | 'debrief'
  | 'experiment'
  | 'exportPreview';

export type MobileAction = {
  id: string;
  label: string;
  kind: 'primary' | 'secondary' | 'destructive';
  route?: string;
};

export type CopyRiskTier = 'low' | 'medium' | 'high';

export type SafetyCopyRef = {
  key: string;
  params?: Record<string, string | number>;
  riskTier: CopyRiskTier;
  reviewedCopyVersion: string;
};

export type SafetyBoundary = {
  label: string;
  educationalOnly: true;
  noDosingAdvice: true;
  copyRefs?: SafetyCopyRef[];
};

export type ParsedFood = {
  item: string;
  quantity: number;
  unit?: string;
  confidenceTier: ConfidenceTier;
};

export type ClarificationQuestion = {
  id: string;
  foodItem?: string;
  prompt: string;
  choices?: string[];
};

export type ClarificationAnswer = {
  questionId: string;
  answer: string;
};

export type ForecastPoint = {
  minute: number;
  mgDl: number;
};

export type ForecastPayload = {
  mealText: string;
  baselineMgDl: number;
  peakMgDl: number;
  peakTimeMinutes: number;
  uncertaintyRangeMgDl?: [number, number];
  points: ForecastPoint[];
};

export type MobileShowcaseCard = {
  id: string;
  kind: MobileCardKind;
  title: string;
  subtitle?: string;
  summary: string;
  confidenceTier?: ConfidenceTier;
  source: DataSource;
  safetyFooter: string;
  copyRefs?: SafetyCopyRef[];
  payload: Record<string, unknown>;
  primaryActions: MobileAction[];
  secondaryActions: MobileAction[];
};

export type CompanionRunEnvelope = {
  schemaVersion: SchemaVersion;
  runId: string;
  draftId?: string;
  phase: CompanionPhase;
  routeRecommendation: RouteRecommendation;
  dataMode: DataMode;
  sourceLabel: string;
  parsedFoods?: ParsedFood[];
  clarificationQuestions?: ClarificationQuestion[];
  cards?: MobileShowcaseCard[];
  safety: SafetyBoundary;
};

export type CompanionRunRequest = {
  schemaVersion: SchemaVersion;
  phase: CompanionPhase;
  text: string;
  mode?: CompanionMode;
  anchor?: string;
  draftId?: string;
  clarificationAnswers?: ClarificationAnswer[];
};
