import SwiftUI

struct MealsView: View {
    @EnvironmentObject private var appState: AppState
    
    // Demo foods - in production this would come from user's actual meal log
    private let demoFoods = ["Pizza", "Pancakes", "Porridge", "Fruit", "Pasta salad"]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    NavigationLink {
                        MealEntryView()
                    } label: {
                        Label("Log a meal", systemImage: "plus.circle")
                    }
                }

                if let prediction = appState.lastPrediction {
                    Section("Latest meal review") {
                        NavigationLink {
                            ForecastResultView(prediction: prediction)
                        } label: {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Text(prediction.mealText)
                                        .font(.headline)
                                    Spacer()
                                    ConfidencePill(tier: prediction.confidenceTier)
                                }

                                HStack(spacing: 18) {
                                    Metric(label: "Peak", value: "\(prediction.predictedPeakMGDL)", unit: "mg/dL")
                                    Metric(label: "Baseline", value: "\(prediction.baselineMGDL)", unit: "mg/dL")
                                    Metric(label: "Peak time", value: "\(prediction.timeToPeakMinutes)", unit: "min")
                                }

                                DataSourcePill(source: prediction.evidenceBasis.dataSource)
                            }
                            .padding(.vertical, 6)
                        }
                    }

                    Section("Graph-backed evidence") {
                        VStack(alignment: .leading, spacing: 10) {
                            Label("Historical context", systemImage: "chart.xyaxis.line")
                                .font(.headline)
                            Text("Similar meals and CGM-backed outcomes are shown as observations, not treatment guidance.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            HStack {
                                Metric(label: "Similar meals", value: "\(prediction.evidenceBasis.similarMealsCount)", unit: "")
                                Metric(label: "CGM outcomes", value: "\(prediction.evidenceBasis.glucoseOutcomesCount)", unit: "")
                            }
                        }
                        .padding(.vertical, 6)
                    }
                } else {
                    Section("Latest meal review") {
                        ContentUnavailableView(
                            "No saved forecasts yet",
                            systemImage: "fork.knife.circle",
                            description: Text("Log a meal to see parsed foods, graph-backed evidence, forecast, confidence, and safety context.")
                        )
                    }
                }

                Section("Food history") {
                    ForEach(demoFoods, id: \.self) { food in
                        NavigationLink {
                            FoodDetailView(foodName: food)
                        } label: {
                            HStack {
                                Text(food)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }

                Section("Safety boundary") {
                    SafetyNoticeCard()
                }
            }
            .navigationTitle("Meals")
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
    MealsView().environmentObject(AppState())
}