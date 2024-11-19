// utils/compare-screenshots.ts
import { compare } from "odiff-bin";

export async function compareScreenshots(
  baselinePath: string,
  currentPath: string,
  diffPath: string
) {
  try {
    const result = await compare(baselinePath, currentPath, diffPath, {
      threshold: 0.1,
      antialiasing: true,
    });

    return {
      imagesAreSame: result.match,
      diffPixels: result.diff,
      diffPercentage: (result.diff / (result.width * result.height)) * 100,
    };
  } catch (error) {
    console.error("Error comparing screenshots:", error);
    throw error;
  }
}
