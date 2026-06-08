import SwiftUI

struct ChatView: View {
    @State private var prompt = ""

    private let demoMessages = [
        ChatMessage(
            role: .user,
            text: "Why was I high at 6pm yesterday?",
            evidence: []
        ),
        ChatMessage(
            role: .assistant,
            text: "Your graph shows a meal-to-delayed-rise pattern with medium confidence. This followed a high-fat pizza logged earlier in the day, which has previously peaked later for this demo profile.",
            evidence: ["Evidence: CGM sync", "Source: meal history", "Educational simulation"]
        )
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        ForEach(demoMessages) { message in
                            ChatBubble(message: message)
                        }

                        InsightContextCard()
                    }
                    .padding()
                }

                ChatInputBar(prompt: $prompt)
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                    .background(.background)
            }
            .navigationTitle("Hoot & Holla")
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

private struct ChatMessage: Identifiable {
    enum Role { case user, assistant }

    let id = UUID()
    let role: Role
    let text: String
    let evidence: [String]
}

private struct ChatBubble: View {
    let message: ChatMessage

    private var isUser: Bool { message.role == .user }

    var body: some View {
        VStack(alignment: isUser ? .trailing : .leading, spacing: 6) {
            if !isUser {
                Label("Hoot AI", systemImage: "lightbulb")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.teal)
            }

            Text(message.text)
                .font(.body)
                .foregroundStyle(isUser ? .white : .primary)
                .padding(14)
                .background(isUser ? Color.teal : Color(.systemBackground), in: RoundedRectangle(cornerRadius: 18))
                .overlay {
                    if !isUser {
                        RoundedRectangle(cornerRadius: 18).stroke(.quaternary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: isUser ? .trailing : .leading)

            if !message.evidence.isEmpty {
                HStack(spacing: 6) {
                    ForEach(message.evidence, id: \.self) { item in
                        Text(item)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(.quaternary, in: Capsule())
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct InsightContextCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Insight Context")
                        .font(.headline)
                    Text("Yesterday's glucose velocity")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                Image(systemName: "sparkles")
                    .foregroundStyle(.teal)
            }

            Text("+142 mg/dL spike identified")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(Color.teal.opacity(0.12), in: Capsule())

            Text("Use chat to ask questions about forecasts, patterns, troubleshooting, situations, daily debriefs, and what-if scenarios. Answers remain evidence-labelled and education-only.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.quaternary))
    }
}

private struct ChatInputBar: View {
    @Binding var prompt: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "mic")
                .foregroundStyle(.secondary)

            TextField("Ask Hoot about your trends...", text: $prompt)
                .textFieldStyle(.plain)

            Button {
                prompt = ""
            } label: {
                Image(systemName: "arrow.up")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(width: 36, height: 36)
                    .background(Color.teal, in: Circle())
            }
            .disabled(prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            .accessibilityLabel("Send message")
        }
        .padding(8)
        .background(.background, in: Capsule())
        .overlay(Capsule().stroke(.quaternary))
    }
}

#Preview {
    ChatView()
}
