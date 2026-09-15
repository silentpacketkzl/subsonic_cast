import SwiftUI

@main
struct ArpeggiCastApp: App {
    @StateObject private var playerVM = PlayerViewModel()
    @StateObject private var libraryVM = LibraryViewModel()

    var body: some Scene {
        WindowGroup {
            MainTabView()
                .environmentObject(playerVM)
                .environmentObject(libraryVM)
                .preferredColorScheme(.dark)
        }
    }
}
