import SwiftUI

public struct MainTabView: View {
    @EnvironmentObject var playerVM: PlayerViewModel
    @State private var selectedTab: Int = 0

    public var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                ListenNowView()
                    .tabItem {
                        Label("Listen Now", systemImage: "play.circle.fill")
                    }
                    .tag(0)

                SearchView()
                    .tabItem {
                        Label("Search", systemImage: "magnifyingglass")
                    }
                    .tag(1)

                SettingsView()
                    .tabItem {
                        Label("Settings", systemImage: "gearshape.fill")
                    }
                    .tag(2)
            }
            .accentColor(.pink)

            // Floating Mini-Player right above tab bar
            MiniPlayerView()
                .padding(.bottom, 54)
        }
        .sheet(isPresented: $playerVM.isNowPlayingSheetPresented) {
            NowPlayingSheet()
        }
    }
}
