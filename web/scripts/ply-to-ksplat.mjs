import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d";
import * as THREE from "three";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.inputPath);
  const outputPath = path.resolve(process.cwd(), options.outputPath);
  const inputData = await readFile(inputPath);
  const inputBuffer = toExactArrayBuffer(inputData);

  console.log("[ply-to-ksplat] parsing PLY…");
  const splatArray = GaussianSplats3D.PlyParser.parseToUncompressedSplatArray(
    inputBuffer,
    options.outputDegree,
  );

  console.log("[ply-to-ksplat] generating KSPLAT…");
  const generator = GaussianSplats3D.SplatBufferGenerator.getStandardGenerator(
    options.alphaRemovalThreshold,
    options.compressionLevel,
    options.sectionSize,
    new THREE.Vector3(...options.sceneCenter),
    options.blockSize,
    options.bucketSize,
  );
  const splatBuffer = generator.generateFromUncompressedSplatArray(splatArray);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, Buffer.from(splatBuffer.bufferData));

  console.log("[ply-to-ksplat] done");
  console.log(`[ply-to-ksplat] input:  ${inputPath}`);
  console.log(`[ply-to-ksplat] output: ${outputPath}`);
  console.log(`[ply-to-ksplat] degree: ${options.outputDegree}`);
  console.log(`[ply-to-ksplat] compression: ${options.compressionLevel}`);
  console.log(`[ply-to-ksplat] sectionSize: ${options.sectionSize}`);
  console.log(`[ply-to-ksplat] blockSize: ${options.blockSize}`);
  console.log(`[ply-to-ksplat] bucketSize: ${options.bucketSize}`);
}

function parseArgs(args) {
  const result = {
    inputPath: "../outputs/iteration-005-progressive-runtime/hhuc-from-sog.ply",
    outputPath: "../outputs/iteration-005-progressive-runtime/hhuc-from-sog.ksplat",
    outputDegree: 2,
    compressionLevel: 1,
    alphaRemovalThreshold: 1,
    sectionSize: 32768,
    sceneCenter: [0, 0, 0],
    blockSize: 5.0,
    bucketSize: 256,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--input" && next) {
      result.inputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--output" && next) {
      result.outputPath = next;
      index += 1;
      continue;
    }

    if (arg === "--degree" && next) {
      result.outputDegree = Math.max(0, Math.min(2, Number.parseInt(next, 10)));
      index += 1;
      continue;
    }

    if (arg === "--compression" && next) {
      result.compressionLevel = Math.max(0, Math.min(2, Number.parseInt(next, 10)));
      index += 1;
      continue;
    }

    if (arg === "--alpha" && next) {
      result.alphaRemovalThreshold = Math.max(0, Math.min(255, Number.parseInt(next, 10)));
      index += 1;
      continue;
    }

    if (arg === "--section-size" && next) {
      result.sectionSize = Math.max(0, Number.parseInt(next, 10));
      index += 1;
      continue;
    }

    if (arg === "--scene-center" && next) {
      result.sceneCenter = next.split(",").map((value) => Number.parseFloat(value));
      index += 1;
      continue;
    }

    if (arg === "--block-size" && next) {
      result.blockSize = Number.parseFloat(next);
      index += 1;
      continue;
    }

    if (arg === "--bucket-size" && next) {
      result.bucketSize = Math.max(1, Number.parseInt(next, 10));
      index += 1;
      continue;
    }
  }

  return result;
}

function toExactArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

main().catch((error) => {
  console.error("[ply-to-ksplat] failed");
  console.error(error);
  process.exitCode = 1;
});
