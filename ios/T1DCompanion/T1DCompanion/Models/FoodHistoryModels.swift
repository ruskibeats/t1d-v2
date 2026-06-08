// Food History Models — data structs for retrospective CGM aggregation
// Units are locale-aware: mmol/L (UK/EU) or mg/dL (US)

import Foundation

// MARK: - Locale Support

/// Determines if user prefers mmol/L (UK/EU) or mg/dL (US)
enum GlucoseUnitPreference {
    case mmolL  // UK/EU standard
    case mg_dL   // US standard
    
    var label: String {
        switch self {
        case .mmolL: return "mmol/L"
        case .mg_dL: return "mg/dL"
        }
    }
    
    static var current: GlucoseUnitPreference {
        // UK app -- use mmol/L
        // In production, check Locale.current or user settings
        .mmolL
    }
}

// MARK: - Food History Models

struct CGMTracePoint: Identifiable, Codable {
    let id = UUID()
    let offsetMinutes: Int
    let meanMMOLL: Double?
    let meanMGDL: Double?
    let minMMOLL: Double?
    let minMGDL: Double?
    let maxMMOLL: Double?
    let maxMGDL: Double?
    let stdMMOLL: Double?
    let stdMGDL: Double?
    let count: Int
}

struct FoodInstancePoint: Identifiable, Codable {
    let id = UUID()
    let offsetMinutes: Int
    let valueMMOLL: Double?
    let valueMGDL: Double?
}

struct FoodInstance: Identifiable, Codable {
    let id = UUID()
    let date: String
    let mealTime: String?
    let startBGMMOLL: Double?
    let startBGMGDL: Double?
    let insulinUnits: Double?
    let isActive: Bool
    let cgmTrace: [FoodInstancePoint]
}

struct FoodHistory: Identifiable, Codable {
    let id = UUID()
    let foodName: String
    let totalInstances: Int
    let timeRangeDays: Int
    let trace: [CGMTracePoint]
    let lastThree: [FoodInstance]
    let insightText: String
    let avgPeakMMOLL: Double?
    let avgPeakMGDL: Double?
    let avgPeakTimeMinutes: Int?
    let disclaimer: String
}

// MARK: - Time Range

enum TimeRange: String, CaseIterable, Identifiable {
    case week = "Week"
    case month = "Month"
    case year = "Year"
    case all = "All"
    
    var id: String { rawValue }
}

// MARK: - Computed Properties

extension FoodHistory {
    /// Returns the appropriate value based on user preference
    func displayPeak(for preference: GlucoseUnitPreference) -> Double? {
        switch preference {
        case .mmolL: return avgPeakMMOLL
        case .mg_dL: return avgPeakMGDL
        }
    }
    
    func displayTraceValue(_ point: CGMTracePoint, for preference: GlucoseUnitPreference) -> Double? {
        switch preference {
        case .mmolL: return point.meanMMOLL ?? (point.meanMGDL.map { $0 / 18.018 })
        case .mg_dL: return point.meanMGDL ?? (point.meanMMOLL.map { $0 * 18.018 })
        }
    }
}

extension FoodInstance {
    func displayStartBG(for preference: GlucoseUnitPreference) -> Double? {
        switch preference {
        case .mmolL: return startBGMMOLL ?? (startBGMGDL.map { $0 / 18.018 })
        case .mg_dL: return startBGMGDL ?? (startBGMMOLL.map { $0 * 18.018 })
        }
    }
}

// MARK: - Demo Data

extension FoodHistory {
    static let demo = FoodHistory(
        foodName: "Pizza",
        totalInstances: 258,
        timeRangeDays: 90,
        trace: _demoTrace(),
        lastThree: _demoLastThree(),
        insightText: _demoInsight(),
        avgPeakMMOLL: 13.2,
        avgPeakMGDL: 238.0,
        avgPeakTimeMinutes: 120,
        disclaimer: "This shows what your glucose has done after eating this food in the past. Individual outcomes vary — this is not a prediction of future results."
    )
    
    private static func _demoTrace() -> [CGMTracePoint] {
        [
            CGMTracePoint(offsetMinutes: 0, meanMMOLL: 6.8, meanMGDL: 122, minMMOLL: 6.2, minMGDL: 112, maxMMOLL: 7.4, maxMGDL: 133, stdMMOLL: 0.3, stdMGDL: 5, count: 258),
            CGMTracePoint(offsetMinutes: 30, meanMMOLL: 9.2, meanMGDL: 166, minMMOLL: 7.8, minMGDL: 140, maxMMOLL: 11.1, maxMGDL: 199, stdMMOLL: 0.8, stdMGDL: 15, count: 258),
            CGMTracePoint(offsetMinutes: 60, meanMMOLL: 11.8, meanMGDL: 212, minMMOLL: 9.5, minMGDL: 171, maxMMOLL: 13.8, maxMGDL: 248, stdMMOLL: 1.2, stdMGDL: 22, count: 258),
            CGMTracePoint(offsetMinutes: 90, meanMMOLL: 12.9, meanMGDL: 232, minMMOLL: 10.2, minMGDL: 184, maxMMOLL: 15.1, maxMGDL: 272, stdMMOLL: 1.5, stdMGDL: 27, count: 258),
            CGMTracePoint(offsetMinutes: 120, meanMMOLL: 13.2, meanMGDL: 238, minMMOLL: 10.8, minMGDL: 194, maxMMOLL: 15.8, maxMGDL: 284, stdMMOLL: 1.6, stdMGDL: 29, count: 258),
            CGMTracePoint(offsetMinutes: 180, meanMMOLL: 11.5, meanMGDL: 207, minMMOLL: 8.9, minMGDL: 160, maxMMOLL: 13.9, maxMGDL: 250, stdMMOLL: 1.4, stdMGDL: 25, count: 258),
            CGMTracePoint(offsetMinutes: 240, meanMMOLL: 9.4, meanMGDL: 169, minMMOLL: 7.1, minMGDL: 128, maxMMOLL: 11.2, maxMGDL: 202, stdMMOLL: 1.1, stdMGDL: 20, count: 258),
        ]
    }
    
    private static func _demoLastThree() -> [FoodInstance] {
        [
            FoodInstance(
                date: "2026-06-02", mealTime: "19:04",
                startBGMMOLL: 7.9, startBGMGDL: 142,
                insulinUnits: 6.0,
                isActive: true,
                cgmTrace: _demoTrace().map { FoodInstancePoint(offsetMinutes: $0.offsetMinutes, valueMMOLL: $0.meanMMOLL, valueMGDL: $0.meanMGDL) }
            ),
            FoodInstance(
                date: "2026-05-30", mealTime: "18:32",
                startBGMMOLL: 6.6, startBGMGDL: 119,
                insulinUnits: 5.0,
                isActive: false,
                cgmTrace: _demoTrace().map { FoodInstancePoint(offsetMinutes: $0.offsetMinutes, valueMMOLL: $0.meanMMOLL.map { $0 - 1.0 }, valueMGDL: $0.meanMGDL.map { $0 - 18 }) }
            ),
            FoodInstance(
                date: "2026-05-27", mealTime: "20:15",
                startBGMMOLL: 9.2, startBGMGDL: 165,
                insulinUnits: 7.0,
                isActive: true,
                cgmTrace: _demoTrace().map { FoodInstancePoint(offsetMinutes: $0.offsetMinutes, valueMMOLL: $0.meanMMOLL.map { $0 + 0.5 }, valueMGDL: $0.meanMGDL.map { $0 + 9 }) }
            ),
        ]
    }
    
    private static func _demoInsight() -> String {
        """
        You've logged **pizza** **258 times** over the last 90 days.
        
        On average, your glucose peaked at **13.2 mmol/L** around **120 minutes** after eating.
        
        Across all instances, your glucose ranged from **6.2–15.8 mmol/L** in the 4 hours after eating.
        
        The last time you had pizza (**2026-06-02**), you rose to **14.9 mmol/L** and dropped back to **6.2 mmol/L** within the 4 hour window.
        
        You were **active** (Apple Watch / smart device) during 2 of the last 3 instances.
        """
    }
}