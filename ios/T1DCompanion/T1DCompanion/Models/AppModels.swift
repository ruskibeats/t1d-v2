import Foundation

struct UserProfile: Identifiable, Codable, Equatable {
    let id: UUID
    var displayName: String
    var anchorType: String
    var dataSource: DataSource

    static let demo = UserProfile(
        id: UUID(),
        displayName: "Tom",
        anchorType: "Foot2Floor",
        dataSource: .syntheticLegend
    )
}

enum DataSource: String, Codable, CaseIterable {
    case realCGM = "real_cgm"
    case nightscout = "nightscout"
    case foodProxy = "food_proxy"
    case syntheticLegend = "synthetic_legend"

    var label: String {
        switch self {
        case .realCGM: "Real CGM"
        case .nightscout: "Nightscout"
        case .foodProxy: "Food proxy"
        case .syntheticLegend: "Synthetic legend"
        }
    }
}

struct CGMSnapshot: Identifiable, Codable, Equatable {
    let id: UUID
    var glucoseMGDL: Int
    var trend: String
    var measuredAt: Date
    var dataSource: DataSource

    static let demo = CGMSnapshot(
        id: UUID(),
        glucoseMGDL: 112,
        trend: "steady",
        measuredAt: .now,
        dataSource: .nightscout
    )
}

struct MealDraft: Codable, Equatable {
    var freeText: String = ""
    var mealType: String = "Breakfast"
    var notes: String = ""
}

struct EvidenceBasis: Codable, Equatable {
    var dataSource: DataSource
    var evidenceRefs: [String]
    var dataWindowDays: Int?
    var similarMealsCount: Int
    var glucoseOutcomesCount: Int
}

struct ConfidenceComponents: Codable, Equatable {
    var identity: Double
    var portion: Double
    var nutrition: Double
    var timing: Double

    var average: Double {
        (identity + portion + nutrition + timing) / 4.0
    }
}

struct PredictionResult: Identifiable, Codable, Equatable {
    let id: UUID
    var mealText: String
    var predictedPeakMGDL: Int
    var baselineMGDL: Int
    var timeToPeakMinutes: Int
    var confidenceTier: String
    var evidenceBasis: EvidenceBasis
    var confidenceComponents: ConfidenceComponents
    var safetyFooter: String

    static let demo = PredictionResult(
        id: UUID(),
        mealText: "Porridge, banana and coffee",
        predictedPeakMGDL: 178,
        baselineMGDL: 112,
        timeToPeakMinutes: 85,
        confidenceTier: "medium",
        evidenceBasis: EvidenceBasis(
            dataSource: .syntheticLegend,
            evidenceRefs: ["demo-profile:foot2floor", "nightscout:latest-cgm"],
            dataWindowDays: 90,
            similarMealsCount: 7,
            glucoseOutcomesCount: 5
        ),
        confidenceComponents: ConfidenceComponents(identity: 0.75, portion: 0.55, nutrition: 0.60, timing: 0.65),
        safetyFooter: "Educational simulator only — not medical advice."
    )
}

struct PatternTrait: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var detail: String
    var confidence: String
    var evidenceCount: Int
    var dataSource: DataSource

    static let demos = [
        PatternTrait(id: UUID(), title: "Breakfast spike tendency", detail: "Morning meals show higher rises than lunch/dinner.", confidence: "medium", evidenceCount: 12, dataSource: .syntheticLegend),
        PatternTrait(id: UUID(), title: "Fat delay", detail: "Higher-fat meals may peak later.", confidence: "low", evidenceCount: 6, dataSource: .foodProxy),
        PatternTrait(id: UUID(), title: "Exercise sensitivity", detail: "Activity appears to reduce post-meal rise.", confidence: "medium", evidenceCount: 8, dataSource: .realCGM)
    ]
}
