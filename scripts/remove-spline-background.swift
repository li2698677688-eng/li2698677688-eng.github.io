import CoreGraphics
import CoreImage
import Foundation
import Vision

enum BackgroundRemovalError: Error, CustomStringConvertible {
    case invalidArguments
    case invalidImage(URL)
    case noForeground(URL)

    var description: String {
        switch self {
        case .invalidArguments:
            return "usage: swift scripts/remove-spline-background.swift <input.png> <output.png>"
        case .invalidImage(let url):
            return "could not read image: \(url.path)"
        case .noForeground(let url):
            return "no foreground subject found: \(url.path)"
        }
    }
}

func removeBackground(inputURL: URL, outputURL: URL) throws {
    guard let inputImage = CIImage(contentsOf: inputURL) else {
        throw BackgroundRemovalError.invalidImage(inputURL)
    }

    let handler = VNImageRequestHandler(ciImage: inputImage, options: [:])
    let request = VNGenerateForegroundInstanceMaskRequest()
    try handler.perform([request])

    guard let observation = request.results?.first else {
        throw BackgroundRemovalError.noForeground(inputURL)
    }

    let maskBuffer = try observation.generateScaledMaskForImage(
        forInstances: observation.allInstances,
        from: handler
    )
    let maskImage = CIImage(cvPixelBuffer: maskBuffer)
    let transparent = CIImage.empty()
    let result = inputImage.applyingFilter(
        "CIBlendWithMask",
        parameters: [
            kCIInputBackgroundImageKey: transparent,
            kCIInputMaskImageKey: maskImage,
        ]
    )

    let context = CIContext(options: [.cacheIntermediates: false])
    let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
    try context.writePNGRepresentation(
        of: result,
        to: outputURL,
        format: .RGBA8,
        colorSpace: colorSpace
    )
}

do {
    guard CommandLine.arguments.count == 3 else {
        throw BackgroundRemovalError.invalidArguments
    }
    let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
    let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
    try removeBackground(inputURL: inputURL, outputURL: outputURL)
    print(outputURL.path)
} catch {
    FileHandle.standardError.write(Data("\(error)\n".utf8))
    exit(1)
}
