import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            HomeView()
                .tabItem { Label("Home", systemImage: "home") }

            InsightsView()
                .tabItem { Label("Patterns", systemImage: "chart.line.uptrend.xyaxis") }

            MealsView()
                .tabItem { Label("Meals", systemImage: "fork.knife") }

            ChatView()
                .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right") }
        }
    }
}

#Preview {
    RootTabView()
        .environmentObject(AppState())
}
