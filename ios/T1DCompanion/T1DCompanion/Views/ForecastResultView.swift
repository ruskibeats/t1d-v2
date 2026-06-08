import SwiftUI

struct ForecastResultView: View {
    var prediction: PredictionResult

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                ForecastSummaryCard(prediction: prediction)
                ForecastChartCard(prediction: prediction)
                ConfidenceBreakdownCard(components: prediction.confidenceComponents)
                EvidenceBasisCard(evidence: prediction.evidenceBasis)
                SafetyNoticeCard()
            }
            .padding()
        }
        .navigationTitle("Forecast")
    }
}

private struct ForecastChartCard: View {
    var prediction: PredictionResult

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Expected glucose shape", subtitle: "Simple preview until backend chart data lands")
            HStack(alignment: .bottom, spacing: 14) {
                Bar(label: "Now", value: prediction.baselineMGDL, max: 260, color: .green)
                Bar(label: "+45", value: (prediction.baselineMGDL + prediction.predictedPeakMGDL) / 2, max: 260, color: .yellow)
                Bar(label: "Peak", value: prediction.predictedPeakMGDL, max: 260, color: .orange)
                Bar(label: "+180", value: max(prediction.baselineMGDL, prediction.predictedPeakMGDL - 35), max: 260, color: .blue)
            }
            .frame(height: 190)
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
}

private struct Bar: View {
    var label: String
    var value: Int
    var max: Int
    var color: Color

    var body: some View {
        VStack {
            Text("\(value)")
                .font(.caption.bold())
            RoundedRectangle(cornerRadius: 8)
                .fill(color.gradient)
                .frame(height: CGFloat(value) / CGFloat(max) * 135)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
    }
}

private struct ConfidenceBreakdownCard: View {
    var components: ConfidenceComponents

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Confidence", subtitle: "Why the result may be uncertain")
            ConfidenceRow(label: "Food identity", value: components.identity)
            ConfidenceRow(label: "Portion", value: components.portion)
            ConfidenceRow(label: "Nutrition", value: components.nutrition)
            ConfidenceRow(label: "Timing", value: components.timing)
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
}

private struct ConfidenceRow: View {
    var label: String
    var value: Double

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text(label)
                Spacer()
                Text(value, format: .percent.precision(.fractionLength(0)))
                    .foregroundStyle(.secondary)
            }
            ProgressView(value: value)
        }
    }
}

private struct EvidenceBasisCard: View {
    var evidence: EvidenceBasis

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            SectionHeader(title: "Evidence basis", subtitle: "Transparent provenance for this forecast")
            DataSourcePill(source: evidence.dataSource)
            Metric(label: "Similar meals", value: "\(evidence.similarMealsCount)", unit: "")
            Metric(label: "Glucose outcomes", value: "\(evidence.glucoseOutcomesCount)", unit: "")
            if let days = evidence.dataWindowDays {
                Metric(label: "Window", value: "\(days)", unit: "days")
            }
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 22))
        .overlay(RoundedRectangle(cornerRadius: 22).stroke(.quaternary))
    }
}

#Preview {
    NavigationStack { ForecastResultView(prediction: .demo) }
}
