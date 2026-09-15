import SwiftUI

public struct DevicePickerSheet: View {
    @EnvironmentObject var playerVM: PlayerViewModel
    @Environment(\.dismiss) var dismiss

    public var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                // Header description
                HStack(spacing: 8) {
                    Image(systemName: "speaker.wave.3.fill")
                        .foregroundColor(.green)
                    Text("Current Audio Output")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
                .padding(.top, 8)

                // Device List
                List {
                    ForEach(playerVM.castService.devices) { device in
                        Button(action: {
                            playerVM.selectDevice(device)
                            dismiss()
                        }) {
                            HStack(spacing: 16) {
                                // Device Icon
                                Image(systemName: device.isRemote ? "desktopcomputer" : "iphone")
                                    .font(.system(size: 22))
                                    .foregroundColor(device.isCurrent ? .green : .primary)
                                    .frame(width: 36, height: 36)
                                    .background(device.isCurrent ? Color.green.opacity(0.15) : Color.gray.opacity(0.15))
                                    .cornerRadius(8)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(device.name)
                                        .font(.system(size: 16, weight: device.isCurrent ? .bold : .medium))
                                        .foregroundColor(device.isCurrent ? .green : .primary)
                                    Text(device.isCurrent ? (device.isRemote ? "Streaming to PC Speakers" : "Playing on iPhone") : "Available on local network")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }

                                Spacer()

                                if device.isCurrent {
                                    Text("ACTIVE")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(.black)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(Color.green)
                                        .cornerRadius(10)
                                }
                            }
                            .padding(.vertical, 4)
                        }
                    }
                }
                .listStyle(.insetGrouped)

                // Wi-Fi instructions footer
                VStack(alignment: .leading, spacing: 6) {
                    Label("Keep your PC receiver running on the same Wi-Fi.", systemImage: "wifi")
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 16)
            }
            .navigationTitle("Connect to a device")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium, .fraction(0.6)])
    }
}
