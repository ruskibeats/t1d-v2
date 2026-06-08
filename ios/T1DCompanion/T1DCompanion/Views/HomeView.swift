import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    ProfileHeader(profile: appState.profile, cgm: appState.latestCGM)

                    if let prediction = appState.lastPrediction {
                        NavigationLink {
                            ForecastResultView(prediction: prediction)
                        } label: {
                            ForecastSummaryCard(prediction: prediction)
                        }
                        .buttonStyle(.plain)
                    }

                    SafetyNoticeCard()

                    SectionHeader(title: "Quick actions", subtitle: "Observation-only tools")
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        QuickActionCard(title: "Log meal", icon: "fork.knife", tint: .blue)
                        QuickActionCard(title: "Try what-if", icon: "arrow.triangle.branch", tint: .purple)
                        QuickActionCard(title: "Daily debrief", icon: "moon.stars", tint: .indigo)
                        QuickActionCard(title: "Export report", icon: "square.and.arrow.up", tint: .green)
                    }
                }
                .padding()
            }
            .navigationTitle("T1D Companion")
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

private struct ProfileHeader: View {
    var profile: UserProfile
    var cgm: CGMSnapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Good day, \(profile.displayName)")
                        .font(.title2.bold())
                    Text(profile.anchorType)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                DataSourcePill(source: profile.dataSource)
            }

            HStack(alignment: .firstTextBaseline) {
                Text("\(cgm.glucoseMGDL)")
                    .font(.system(size: 48, weight: .semibold, design: .rounded))
                Text("mg/dL")
                    .foregroundStyle(.secondary)
                Spacer()
                VStack(alignment: .trailing) {
                    Text(cgm.trend.capitalized)
                        .font(.headline)
                    Text(cgm.measuredAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            DataSourcePill(source: cgm.dataSource)
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 22))
    }
}

struct ForecastSummaryCard: View {
    var prediction: PredictionResult

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Latest forecast")
                    .font(.headline)
                Spacer()
                ConfidencePill(tier: prediction.confidenceTier)
            }
            Text(prediction.mealText)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(spacing: 20) {
                Metric(label: "Peak", value: "\(prediction.predictedPeakMGDL)", unit: "mg/dL")
                Metric(label: "Baseline", value: "\(prediction.baselineMGDL)", unit: "mg/dL")
                Metric(label: "Peak time", value: "\(prediction.timeToPeakMinutes)", unit: "min")
            }
            DataSourcePill(source: prediction.evidenceBasis.dataSource)
        }
        .padding()
        .background(Color.blue.opacity(0.10), in: RoundedRectangle(cornerRadius: 22))
    }
}

struct SafetyNoticeCard: View {
    var body: some View {
        Label("Educational simulator only — not medical advice. No dosing or treatment changes.", systemImage: "shield.lefthalf.filled")
            .font(.footnote)
            .foregroundStyle(.secondary)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 18))
    }
}

struct QuickActionCard: View {
    var title: String
    var icon: String
    var tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(tint)
            Text(title)
                .font(.headline)
            Text("Open")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.quaternary))
    }
}
