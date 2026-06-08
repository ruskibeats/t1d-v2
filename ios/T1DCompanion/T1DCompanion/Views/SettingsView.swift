import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    LabeledContent("Name", value: appState.profile.displayName)
                    LabeledContent("Anchor", value: appState.profile.anchorType)
                    LabeledContent("Source", value: appState.profile.dataSource.label)
                }

                Section("Backend") {
                    LabeledContent("Base URL", value: appState.backendBaseURL.absoluteString)
                    Text("Update this once the mobile API endpoint is defined.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }

                Section("Safety") {
                    Text("The app is observation-only. It must not provide insulin dosing, treatment changes, or emergency triage instructions.")
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView().environmentObject(AppState())
}
