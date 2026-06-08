import SwiftUI

struct InsightsView: View {
    private let traits = PatternTrait.demos

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("Recurring patterns are labelled with source and confidence. Demo/synthetic data is never presented as personal history.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Pattern Genome") {
                    ForEach(traits) { trait in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text(trait.title).font(.headline)
                                Spacer()
                                ConfidencePill(tier: trait.confidence)
                            }
                            Text(trait.detail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            HStack {
                                Label("\(trait.evidenceCount) data points", systemImage: "number.circle")
                                Spacer()
                                DataSourcePill(source: trait.dataSource)
                            }
                            .font(.caption)
                        }
                        .padding(.vertical, 6)
                    }
                }
            }
            .navigationTitle("Patterns")
            .toolbar {
                NavigationLink {
                    SettingsView()
                } label: {
                    Image(systemName: "gearshape")
                }
                .accessibilityLabel("Settings")
            }
        }
    }
}

#Preview {
    InsightsView()
}
