import SwiftUI

struct MealEntryView: View {
    @EnvironmentObject private var appState: AppState
    @State private var draft = MealDraft()
    @State private var isPredicting = false
    @State private var errorMessage: String?

    private let mealTypes = ["Breakfast", "Lunch", "Dinner", "Snack", "What-if"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Meal") {
                    Picker("Type", selection: $draft.mealType) {
                        ForEach(mealTypes, id: \.self) { Text($0) }
                    }

                    TextField("e.g. porridge, banana and coffee", text: $draft.freeText, axis: .vertical)
                        .lineLimit(3...6)

                    TextField("Optional notes", text: $draft.notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Safety boundary") {
                    Text("Forecasts are educational simulations. This app does not recommend insulin doses, treatment changes, or emergency actions.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }

                Section {
                    Button {
                        Task { await predict() }
                    } label: {
                        HStack {
                            if isPredicting { ProgressView() }
                            Text("Generate forecast")
                        }
                    }
                    .disabled(draft.freeText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isPredicting)
                }
            }
            .navigationTitle("Meal Entry")
        }
    }

    @MainActor
    private func predict() async {
        isPredicting = true
        errorMessage = nil
        defer { isPredicting = false }

        do {
            appState.lastPrediction = try await appState.apiClient.predictMeal(draft)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    MealEntryView().environmentObject(AppState())
}
