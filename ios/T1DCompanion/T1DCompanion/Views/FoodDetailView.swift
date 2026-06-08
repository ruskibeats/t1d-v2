import SwiftUI
import Charts

/// Food Detail View — shows historical CGM trace for a food item.
/// Class I compliant: factual retrospection only, no forward prediction.
/// Units adapt to user locale (mmol/L UK/EU, mg/dL US).
struct FoodDetailView: View {
    // MARK: - Properties
    
    @State private var selectedTimeRange: TimeRange = .all
    @State private var foodHistory: FoodHistory = .demo
    
    private let foodName: String
    private let unitPreference: GlucoseUnitPreference
    
    // MARK: - Body
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                headerCard
                timeRangePicker
                
                if !foodHistory.trace.isEmpty {
                    traceChart
                } else {
                    ContentUnavailableView(
                        "No data in this range",
                        systemImage: "chart.line.uptrend.xyaxis",
                        description: Text("No logged instances of \(foodName) in the selected time range.")
                    )
                }
                
                lastThreeCard
                insightCard
                disclaimerCard
            }
            .padding()
        }
        .navigationTitle(foodName)
        .navigationBarTitleDisplayMode(.inline)
        .background(Color(.systemGroupedBackground))
    }
    
    // MARK: - UI Components
    
    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Food history")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(foodName)
                        .font(.title2.bold())
                }
                Spacer()
                Metric(label: "Logged", value: "\(foodHistory.totalInstances)", unit: "times")
            }
            
            if foodHistory.timeRangeDays > 0 {
                Text("\(foodHistory.timeRangeDays) day span")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
    
    private var timeRangePicker: some View {
        Picker("Time range", selection: $selectedTimeRange) {
            ForEach(TimeRange.allCases) { range in
                Text(range.rawValue).tag(range)
            }
        }
        .pickerStyle(.segmented)
        .onChange(of: selectedTimeRange) { _ in
            // Future: reload data with new time range
        }
    }
    
    private var traceChart: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(
                title: "Average CGM trace",
                subtitle: "First 4 hours after eating"
            )
            
            // Build chart data using user's preferred unit
            let chartData = foodHistory.trace.compactMap { point -> (offset: Int, mean: Double)? in
                guard let mean = foodHistory.displayTraceValue(point, for: unitPreference) else { return nil }
                return (point.offsetMinutes, mean)
            }
            
            Chart {
                ForEach(chartData, id: \.offset) { item in
                    LineMark(
                        x: .value("Time (min)", item.offset),
                        y: .value("Glucose", item.mean)
                    )
                    .interpolationMethod(.catmullRom)
                    .foregroundStyle(.blue)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading) { _ in
                    AxisGridLine()
                    AxisTick()
                    AxisValueLabel { value in
                        if let double = value.as(Double.self) {
                            Text("\(Int(double))")
                        }
                    }
                }
            }
            .chartXAxis {
                AxisMarks(values: [0, 60, 120, 180, 240]) { _ in
                    AxisGridLine()
                    AxisTick()
                    AxisValueLabel { value in
                        if let minutes = value.as(Int.self) {
                            Text("\(minutes)m")
                        }
                    }
                }
            }
            .frame(height: 220)
            
            if let peak = foodHistory.displayPeak(for: unitPreference),
               let peakTime = foodHistory.avgPeakTimeMinutes {
                HStack(spacing: 24) {
                    Metric(label: "Peak", value: String(format: "%.1f", peak), unit: unitPreference.label)
                    Metric(label: "Time", value: "\(peakTime)", unit: "min")
                }
            }
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
    
    private var lastThreeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(
                title: "Last 3 times",
                subtitle: "How you responded"
            )
            
            if foodHistory.lastThree.isEmpty {
                Text("No logged instances yet")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(foodHistory.lastThree) { instance in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(instance.date)
                                .font(.subheadline.bold())
                            if let mealTime = instance.mealTime {
                                Text("logged at \(mealTime)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        VStack(alignment: .trailing, spacing: 2) {
                            if let bg = instance.displayStartBG(for: unitPreference) {
                                Text(String(format: "%.1f", bg))
                                    .font(.subheadline.bold())
                            }
                            Text("\(unitPreference.label) start")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        
                        if let insulin = instance.insulinUnits {
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(String(format: "%.1f", insulin))
                                    .font(.subheadline.bold())
                                Text("units")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        
                        Image(systemName: instance.isActive ? "figure.run" : "figure.stand")
                            .foregroundStyle(instance.isActive ? .blue : .secondary)
                    }
                    .padding(.vertical, 4)
                    
                    if instance.id != foodHistory.lastThree.last?.id {
                        Divider()
                    }
                }
            }
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
    
    private var insightCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(
                title: "What this shows",
                subtitle: "Class I safe — factual retrospection only"
            )
            
            Text(foodHistory.insightText)
                .font(.subheadline)
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
    
    private var disclaimerCard: some View {
        Text(foodHistory.disclaimer)
            .font(.caption)
            .foregroundStyle(.secondary)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 18))
    }
}

// MARK: - Initializer

extension FoodDetailView {
    init(foodName: String, foodHistory: FoodHistory? = nil) {
        self.foodName = foodName
        self._foodHistory = State(initialValue: foodHistory ?? .demo)
        self.unitPreference = .current
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        FoodDetailView(foodName: "Pizza")
            .environmentObject(AppState())
    }
}