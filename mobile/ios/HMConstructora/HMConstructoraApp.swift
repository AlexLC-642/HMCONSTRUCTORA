import SwiftUI

@main
struct HMConstructoraApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var viewModel = AppViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView(viewModel: viewModel)
                .onChange(of: scenePhase) { newPhase in
                    viewModel.handleScenePhase(newPhase)
                }
        }
    }
}
