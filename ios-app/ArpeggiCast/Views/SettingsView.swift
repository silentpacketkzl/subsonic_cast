import SwiftUI

public struct SettingsView: View {
    @EnvironmentObject var libraryVM: LibraryViewModel

    @State private var serverUrl: String = ""
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var pingStatus: String = ""
    @State private var isTesting: Bool = false

    public var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Navidrome Server"), footer: Text("Connect to your self-hosted Navidrome or Subsonic media server.")) {
                    TextField("Server URL (http://192.168.1.100:4533)", text: $serverUrl)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                        .keyboardType(.URL)

                    TextField("Username", text: $username)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)

                    SecureField("Password / Token", text: $password)
                }

                if !pingStatus.isEmpty {
                    Section {
                        Text(pingStatus)
                            .font(.footnote)
                            .foregroundColor(pingStatus.contains("Success") ? .green : .red)
                    }
                }

                Section {
                    Button(action: testConnection) {
                        HStack {
                            Text("Test Connection")
                            if isTesting {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }

                    Button(action: saveSettings) {
                        Text("Save & Sync Library")
                            .fontWeight(.semibold)
                    }
                }

                Section(header: Text("Spotify Connect / Casting")) {
                    HStack {
                        Text("PC Speaker Protocol")
                        Spacer()
                        Text("WebSocket Relay")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Default Cast Target")
                        Spacer()
                        Text("Windows PC (Speakers)")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .onAppear {
                self.serverUrl = libraryVM.subsonicService.serverUrl
                self.username = libraryVM.subsonicService.username
                self.password = libraryVM.subsonicService.password
            }
        }
    }

    private func testConnection() {
        guard !serverUrl.isEmpty, !username.isEmpty else {
            pingStatus = "Please enter Server URL and Username."
            return
        }

        isTesting = true
        pingStatus = "Testing connection..."

        libraryVM.subsonicService.saveCredentials(serverUrl: serverUrl, username: username, password: password)

        Task {
            do {
                let success = try await libraryVM.subsonicService.ping()
                isTesting = false
                pingStatus = success ? "✓ Successfully connected to Navidrome!" : "✕ Server replied with an error."
            } catch {
                isTesting = false
                pingStatus = "✕ Connection failed: \(error.localizedDescription)"
            }
        }
    }

    private func saveSettings() {
        libraryVM.subsonicService.saveCredentials(serverUrl: serverUrl, username: username, password: password)
        libraryVM.loadInitialData()
        pingStatus = "Settings saved! Syncing library..."
    }
}
