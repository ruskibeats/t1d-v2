// T1D Companion iOS - SwiftUI Design System
// Companion to DESIGN.md for native iOS implementation

import SwiftUI

// MARK: - Color System
extension Color {
    static let baseline = Color(hex: "#1976D2")
    
    // Status colors
    static let success = Color(hex: "#E8F5E9")
    static let successText = Color(hex: "#2E7D32")
    static let warning = Color(hex: "#FFF3E0")
    static let warningText = Color(hex: "#EF6C00")
    static let error = Color(hex: "#FFEBEE")
    static let errorText = Color(hex: "#C62828")
    
    // Confidence badge colors
    static let confidenceHigh = Color(hex: "#2E7D32")
    static let confidenceMedium = Color(hex: "#EF6C00")
    static let confidenceLow = Color(hex: "#C62828")
    
    // Medical status
    static let hypoRange = Color(hex: "#1976D2")
    static let hyperRange = Color(hex: "#FF9800")
}

// MARK: - Typography Scale
extension Font {
    static let title = Font.system(size: 24, weight: .semibold)
    static let heading = Font.system(size: 20, weight: .semibold)
    static let body = Font.system(size: 16, weight: .regular)
    static let caption = Font.system(size: 14, weight: .regular)
    static let overline = Font.system(size: 12, weight: .medium)
}

// MARK: - Spacing
private let spacingXS: CGFloat = 4
private let spacingSM: CGFloat = 8
private let spacingMD: CGFloat = 12
private let spacingLG: CGFloat = 16
private let spacingXL: CGFloat = 24

private let minimumTouchTarget: CGFloat = 44

// MARK: - Components

// MARK: Card Component
struct ForecastCard<Content: View>: View {
    let title: String
    let badge: ConfidenceLevel?
    let sourceLabel: String?
    let content: Content
    
    var body: some View {
        VStack(alignment: .leading, spacing: spacingMD) {
            HStack {
                Text(title)
                    .font(.heading)
                if let badge = badge {
                    ConfidenceBadge(level: badge)
                }
                Spacer()
                if let source = sourceLabel {
                    Text(source)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            content
            SafetyFooter()
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 2)
    }
}

// MARK: Confidence Badge
enum ConfidenceLevel: String, CaseIterable {
    case high = "high"
    case medium = "medium"
    case low = "low"
    
    var color: Color {
        switch self {
        case .high: return .confidenceHigh
        case .medium: return .confidenceMedium
        case .low: return .confidenceLow
        }
    }
    
    var icon: String {
        switch self {
        case .high: return "checkmark.circle.fill"
        case .medium: return "exclamationmark.circle.fill"
        case .low: return "xmark.circle.fill"
        }
    }
}

struct ConfidenceBadge: View {
    let level: ConfidenceLevel
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: level.icon)
                .foregroundColor(level.color)
            Text(level.rawValue.capitalized)
                .font(.caption)
                .foregroundColor(level.color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(level.color.opacity(0.1))
        .cornerRadius(16)
        .accessibilityLabel("\(level.rawValue.capitalized) confidence")
    }
}

// MARK: Forecast Chart
struct ForecastChart: View {
    let baseline: Int
    let peak: Int
    let peakTime: Int
    let uncertaintyRange: ClosedRange<Int>?
    
    var body: some View {
        VStack(alignment: .leading, spacing: spacingSM) {
            Text("Forecast")
                .font(.heading)
            
            ForecastLineChartView(
                baseline: baseline,
                peak: peak,
                peakTime: peakTime,
                uncertaintyRange: uncertaintyRange
            )
            .frame(height: 120)
            
            HStack {
                VStack(alignment: .leading) {
                    Text("Peak")
                        .font(.caption)
                    Text("~\(peak) mg/dL at ~\((peakTime / 60)) hrs")
                        .font(.body)
                }
                Spacer()
                if let range = uncertaintyRange {
                    VStack(alignment: .trailing) {
                        Text("Range")
                            .font(.caption)
                        Text("\(range.lowerBound)–\(range.upperBound) mg/dL")
                            .font(.body)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Forecast: \(peak) mg/dL peak at \(peakTime) minutes")
        .accessibilityHint("Uncertainty range \(uncertaintyRange?.lowerBound ?? peak) to \(uncertaintyRange?.upperBound ?? peak)")
    }
}

// MARK: Food Evidence Row
struct FoodEvidenceRow: View {
    let item: String
    let quantity: Int
    let unit: String?
    let carbs: Int
    let fat: Int
    let sugars: Int
    let confidence: ConfidenceLevel
    let warnings: [String]?
    let uncertaintyReason: String?
    
    var body: some View {
        VStack(alignment: .leading, spacing: spacingXS) {
            HStack(spacing: 4) {
                Image(systemName: confidence == .high ? "checkmark.circle" : "exclamationmark.circle")
                    .foregroundColor(confidence.color)
                
                Text("\(quantity) \(unit ?? "") \(item)")
                    .font(.body)
                
                Spacer()
                
                Text("\(carbs)g carbs \(fat)g fat \(sugars)g sugar conf: \(confidence.rawValue)")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            if let warnings = warnings {
                ForEach(warnings, id: \.self) { warning in
                    Label(warning, systemImage: "exclamationmark.triangle")
                        .font(.caption)
                        .foregroundColor(.warningText)
                }
            }
            
            if let reason = uncertaintyReason {
                Label("Main uncertainty: \(reason)", systemImage: "lightbulb")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item) with \(carbs) carbs, \(fat) fat, \(sugars) sugar, \(confidence.rawValue) confidence")
    }
}

// MARK: Safety Footer
struct SafetyFooter: View {
    var body: some View {
        Text("Educational simulation only — not medical advice.")
            .font(.caption)
            .foregroundColor(.secondary)
            .italic()
            .padding(.top, spacingSM)
            .accessibilityLabel("Educational simulation only")
    }
}

// MARK: - Screen Templates

// MARK: Today Screen
struct TodayScreen: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: spacingLG) {
                    // Current CGM
                    ForecastCard(title: "Current CGM", sourceLabel: "synthetic legends demo") {
                        HStack {
                            Text("105")
                                .font(.largeTitle)
                                .bold()
                            VStack(alignment: .leading) {
                                Text("mg/dL")
                                    .font(.caption)
                                Text("↘ stable")
                                    .font(.caption)
                            }
                            Spacer()
                            Text("Recorded: 12:19")
                                .font(.caption)
                        }
                    }
                    
                    // Quick Actions
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: spacingMD) {
                        QuickActionButton(icon: "fork.knife", label: "Log Meal") {
                            // Navigate to meal entry
                        }
                        QuickActionButton(icon: "chart.xyaxis.line", label: "Patterns") {
                            // Navigate to insights
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Today")
            .toolbar {
                NavigationLink(destination: SettingsScreen()) {
                    Image(systemName: "person.circle")
                }
            }
        }
    }
}

// MARK: Meal Entry Screen
struct MealEntryScreen: View {
    @State private var mealText = ""
    @State private var useLLM = true
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Meal Description")) {
                    TextField("e.g., pizza and salad", text: $mealText)
                        .submitLabel(.done)
                }
                
                Section {
                    Toggle("Use AI Parser", isOn: $useLLM)
                    Text("Requires internet connection for LLM")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section {
                    Button("Parse Meal") {
                        // Parse meal action
                    }
                    .disabled(mealText.isEmpty)
                }
            }
            .navigationTitle("Log Meal")
            .toolbar {
                ToolbarItem(placement: .keyboard) {
                    Button("Done") {
                        hideKeyboard()
                    }
                }
            }
        }
    }
}

// MARK: Forecast Results Screen
struct ForecastResultsScreen: View {
    @State private var selectedCard = 0
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Swipe tabs
                Picker("Step", selection: $selectedCard) {
                    Text("Parsed").tag(0)
                    Text("Evidence").tag(1)
                    Text("Forecast").tag(2)
                    Text("History").tag(3)
                }
                .pickerStyle(.segmented)
                .padding()
                
                TabView(selection: $selectedCard) {
                    ParsedFoodsView().tag(0)
                    FoodEvidenceView().tag(1)
                    ForecastDetailView().tag(2)
                    MealMemoryView().tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .automatic))
                
                // Action Bar
                HStack(spacing: spacingSM) {
                    ActionButton(icon: "pencil", label: "Edit")
                    ActionButton(icon: "questionmark.circle", label: "Clarify")
                    ActionButton(icon: "arrow.left.arrow.right", label: "What-If")
                    ActionButton(icon: "square.and.arrow.down", label: "Save")
                    ActionButton(icon: "square.and.arrow.up", label: "Export")
                }
                .padding()
            }
            .navigationTitle("Pizza and Salad")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    ConfidenceBadge(level: .medium)
                }
            }
        }
    }
}

// MARK: - Helper Views
struct QuickActionButton: View {
    let icon: String
    let label: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack {
                Image(systemName: icon)
                    .font(.largeTitle)
                Text(label)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .frame(height: minimumTouchTarget)
        }
        .buttonStyle(.bordered)
    }
}

struct ActionButton: View {
    let icon: String
    let label: String
    
    var body: some View {
        VStack(spacing: 2) {
            Image(systemName: icon)
                .font(.body)
            Text(label)
                .font(.caption2)
        }
        .frame(width: minimumTouchTarget, height: minimumTouchTarget)
        .contentShape(Rectangle())
    }
}

// MARK: - Extensions
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.charactersToBeRemovedFromHex)
        let scanner = Scanner(string: hex)
        var hexNumber: UInt64 = 0
        
        if scanner.scanHexInt64(&hexNumber) {
            let a, r, g, b: UInt64
            switch hex.count {
            case 3:
                (a, r, g, b) = (255, 
                    (hexNumber >> 8) * 17, 
                    ((hexNumber >> 4) & 0xF) * 17, 
                    (hexNumber & 0xF) * 17)
            case 6:
                (a, r, g, b) = (255,
                    (hexNumber >> 16) & 0xFF,
                    (hexNumber >> 8) & 0xFF,
                    hexNumber & 0xFF)
            case 8:
                (a, r, g, b) = ((hexNumber >> 24) & 0xFF,
                    (hexNumber >> 16) & 0xFF,
                    (hexNumber >> 8) & 0xFF,
                    hexNumber & 0xFF)
            default:
                (a, r, g, b) = (255, 0, 0, 0)
            }
            self.init(
                .sRGB,
                red: Double(r) / 255,
                green: Double(g) / 255,
                blue: Double(b) / 255,
                opacity: Double(a) / 255
            )
        } else {
            self.init(.sRGB, red: 0, green: 0, blue: 0)
        }
    }
}

extension CharacterSet {
    static let charactersToBeRemovedFromHex = CharacterSet.alphanumerics.inverted
}

// MARK: - Preview
struct DesignSystemPreview: PreviewProvider {
    static var previews: some View {
        Group {
            TodayScreen()
                .previewDisplayName("Today Screen")
            
            MealEntryScreen()
                .previewDisplayName("Meal Entry")
            
            ForecastResultsScreen()
                .previewDisplayName("Forecast Results")
        }
    }
}