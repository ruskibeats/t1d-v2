import SwiftUI

@main
struct T1DCompanionApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environmentObject(appState)
        }
    }
}

@MainActor
final class AppState: ObservableObject {
    @Published var profile = UserProfile.demo
    @Published var latestCGM = CGMSnapshot.demo
    @Published var lastPrediction: PredictionResult? = PredictionResult.demo
    @Published var backendBaseURL = URL(string: "http://192.168.0.92:8000")!

    lazy var apiClient = APIClient(baseURL: backendBaseURL)
}
