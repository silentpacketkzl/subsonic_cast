// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ArpeggiCast",
    platforms: [
        .iOS(.v16)
    ],
    products: [
        .library(
            name: "ArpeggiCast",
            targets: ["ArpeggiCast"]
        )
    ],
    targets: [
        .target(
            name: "ArpeggiCast",
            path: "ArpeggiCast"
        )
    ]
)
