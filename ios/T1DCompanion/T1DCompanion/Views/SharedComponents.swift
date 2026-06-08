import SwiftUI

struct SectionHeader: View {
    var title: String
    var subtitle: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.headline)
            if let subtitle {
                Text(subtitle).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

struct DataSourcePill: View {
    var source: DataSource

    var body: some View {
        Text(source.label)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.14), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch source {
        case .realCGM, .nightscout: .green
        case .foodProxy: .orange
        case .syntheticLegend: .purple
        }
    }
}

struct ConfidencePill: View {
    var tier: String

    var body: some View {
        Text(tier.capitalized)
            .font(.caption.weight(.bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(color.opacity(0.14), in: Capsule())
            .foregroundStyle(color)
    }

    private var color: Color {
        switch tier.lowercased() {
        case "high": .green
        case "medium": .orange
        default: .red
        }
    }
}

struct Metric: View {
    var label: String
    var value: String
    var unit: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text(value).font(.title3.bold())
                if !unit.isEmpty {
                    Text(unit).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }
}
