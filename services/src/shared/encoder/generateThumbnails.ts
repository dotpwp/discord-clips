import sharp from "sharp";

/**
 * Generates thumbnails for a file. Returns an array of image encoder promises.
 * Resolutions: max:1280x720, med:640x360, min:320x180
 * @param outputFolder - Folder to Write Images to
 * @param imagePath - Image path to retrieve images from
 */
export default function generateThumbnails(outputFolder: string, imagePath: string) {
    return Promise.all([
        // WEBP Images (Future)
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 1280, height: 720 })
            .webp({ quality: 90 })
            .toFile(`${outputFolder}/max_default.webp`),
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 640, height: 360 })
            .webp({ quality: 75 })
            .toFile(`${outputFolder}/med_default.webp`),
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 320, height: 180 })
            .webp({ quality: 60 })
            .toFile(`${outputFolder}/min_default.webp`),

        // JPEG Images (Legacy)
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 1280, height: 720 })
            .jpeg({ quality: 80 })
            .toFile(`${outputFolder}/max_default.jpeg`),
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 640, height: 360 })
            .jpeg({ quality: 65 })
            .toFile(`${outputFolder}/med_default.jpeg`),
        sharp(imagePath)
            .resize({ background: "#000", fit: "contain", width: 320, height: 180 })
            .jpeg({ quality: 50 })
            .toFile(`${outputFolder}/min_default.jpeg`)
    ])
}