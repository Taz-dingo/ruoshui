import { mkdir, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";

const shC0 = 0.28209479177387814;
const sqrt2 = Math.SQRT2;
const bandsByCentroidsWidth = {
  192: 1,
  512: 2,
  960: 3,
};
const coeffsPerChannelByDegree = {
  0: 0,
  1: 3,
  2: 8,
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(process.cwd(), options.inputPath);
  const outputPath = path.resolve(process.cwd(), options.outputPath);
  const inputBuffer = await readFile(inputPath);
  const archive = unzipSync(new Uint8Array(inputBuffer));
  const meta = JSON.parse(strFromU8(requireEntry(archive, "meta.json")));

  const meansLower = await decodeWebp(archive, "means_l.webp");
  const meansUpper = await decodeWebp(archive, "means_u.webp");
  const quaternions = await decodeWebp(archive, "quats.webp");
  const scales = await decodeWebp(archive, "scales.webp");
  const sh0 = await decodeWebp(archive, "sh0.webp");
  const shLabels = hasEntry(archive, "shN_labels.webp")
    ? await decodeWebp(archive, "shN_labels.webp")
    : null;
  const shCentroids = hasEntry(archive, "shN_centroids.webp")
    ? await decodeWebp(archive, "shN_centroids.webp")
    : null;

  const sourceBands = shCentroids ? calcBands(shCentroids.info.width) : 0;
  const maxSupportedDegree = sourceBands >= 2 ? 2 : sourceBands;
  const outputDegree = clampInt(
    options.outputDegree ?? maxSupportedDegree,
    0,
    maxSupportedDegree,
  );
  const coeffsPerChannel = coeffsPerChannelByDegree[outputDegree];
  const outputRestCount = coeffsPerChannel * 3;
  const totalSplats = Math.min(
    Number.isFinite(options.limit) ? options.limit : meta.count,
    meta.count,
  );

  const propertyNames = [
    "scale_0",
    "scale_1",
    "scale_2",
    "rot_0",
    "rot_1",
    "rot_2",
    "rot_3",
    "x",
    "y",
    "z",
    "f_dc_0",
    "f_dc_1",
    "f_dc_2",
    "opacity",
    "red",
    "green",
    "blue",
    ...Array.from({ length: outputRestCount }, (_, index) => `f_rest_${index}`),
  ];

  await mkdir(path.dirname(outputPath), { recursive: true });
  const stream = createWriteStream(outputPath);

  const headerLines = [
    "ply",
    "format binary_little_endian 1.0",
    "comment generated from PlayCanvas SOG by web/scripts/sog-to-ply.mjs",
    `comment source_bands ${sourceBands}`,
    `comment output_degree ${outputDegree}`,
    `element vertex ${totalSplats}`,
    ...propertyNames.map((name) => `property float ${name}`),
    "end_header",
    "",
  ];

  await writeChunk(stream, Buffer.from(headerLines.join("\n"), "utf8"));

  const floatsPerRow = propertyNames.length;
  const chunkRows = Math.max(1, Math.min(options.chunkRows ?? 8192, totalSplats));
  const rowBuffer = Buffer.allocUnsafe(chunkRows * floatsPerRow * 4);
  const rowFloats = new Float32Array(
    rowBuffer.buffer,
    rowBuffer.byteOffset,
    rowBuffer.byteLength / 4,
  );
  const sourceSh = new Float32Array(45);

  for (let baseIndex = 0; baseIndex < totalSplats; baseIndex += chunkRows) {
    const rowsInChunk = Math.min(chunkRows, totalSplats - baseIndex);

    for (let localIndex = 0; localIndex < rowsInChunk; localIndex += 1) {
      const splatIndex = baseIndex + localIndex;
      const outputBase = localIndex * floatsPerRow;
      fillSourceSh(
        sourceSh,
        meta,
        sourceBands,
        shLabels?.data,
        shCentroids?.data,
        shCentroids?.info.width ?? 0,
        splatIndex,
      );
      writeSplatRow({
        output: rowFloats,
        offset: outputBase,
        meta,
        meansLower: meansLower.data,
        meansUpper: meansUpper.data,
        quaternions: quaternions.data,
        scales: scales.data,
        sh0: sh0.data,
        splatIndex,
        outputDegree,
        coeffsPerChannel,
        sourceSh,
      });
    }

    const bytesToWrite = rowsInChunk * floatsPerRow * 4;
    await writeChunk(stream, rowBuffer.subarray(0, bytesToWrite));
    if ((baseIndex / chunkRows) % 10 === 0) {
      const progress = (((baseIndex + rowsInChunk) / totalSplats) * 100).toFixed(1);
      console.log(
        `[sog-to-ply] ${progress}% (${baseIndex + rowsInChunk}/${totalSplats})`,
      );
    }
  }

  await new Promise((resolve, reject) => {
    stream.on("error", reject);
    stream.end(resolve);
  });

  console.log("[sog-to-ply] done");
  console.log(`[sog-to-ply] input:  ${inputPath}`);
  console.log(`[sog-to-ply] output: ${outputPath}`);
  console.log(`[sog-to-ply] splats: ${totalSplats}/${meta.count}`);
  console.log(`[sog-to-ply] sh degree: ${outputDegree} (source bands=${sourceBands})`);
}

function parseArgs(args) {
  const result = {
    inputPath: "../assets/hhuc.sog",
    outputPath: "../outputs/iteration-005-progressive-runtime/hhuc-from-sog.ply",
    outputDegree: undefined,
    limit: undefined,
    chunkRows: undefined,
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
      result.outputDegree = clampInt(Number.parseInt(next, 10), 0, 2);
      index += 1;
      continue;
    }

    if (arg === "--limit" && next) {
      result.limit = Math.max(1, Number.parseInt(next, 10));
      index += 1;
      continue;
    }

    if (arg === "--chunk-rows" && next) {
      result.chunkRows = Math.max(1, Number.parseInt(next, 10));
      index += 1;
      continue;
    }
  }

  return result;
}

async function decodeWebp(archive, entryName) {
  const input = Buffer.from(requireEntry(archive, entryName));
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
    info,
  };
}

function writeSplatRow({
  output,
  offset,
  meta,
  meansLower,
  meansUpper,
  quaternions,
  scales,
  sh0,
  splatIndex,
  outputDegree,
  coeffsPerChannel,
  sourceSh,
}) {
  const texelBase = splatIndex * 4;

  const nx = decodeMean(meta.means, meansLower, meansUpper, texelBase + 0);
  const ny = decodeMean(meta.means, meansLower, meansUpper, texelBase + 1);
  const nz = decodeMean(meta.means, meansLower, meansUpper, texelBase + 2);
  const [rot0, rot1, rot2, rot3] = decodeQuaternion(quaternions, texelBase);
  const [scale0, scale1, scale2] = decodeScales(meta, scales, texelBase);
  const [fDc0, fDc1, fDc2, opacityRaw, red, green, blue] = decodeSh0(meta, sh0, texelBase);

  let cursor = offset;
  output[cursor++] = scale0;
  output[cursor++] = scale1;
  output[cursor++] = scale2;
  output[cursor++] = rot0;
  output[cursor++] = rot1;
  output[cursor++] = rot2;
  output[cursor++] = rot3;
  output[cursor++] = nx;
  output[cursor++] = ny;
  output[cursor++] = nz;
  output[cursor++] = fDc0;
  output[cursor++] = fDc1;
  output[cursor++] = fDc2;
  output[cursor++] = opacityRaw;
  output[cursor++] = red;
  output[cursor++] = green;
  output[cursor++] = blue;

  if (outputDegree > 0) {
    for (let channel = 0; channel < 3; channel += 1) {
      for (let coeffIndex = 0; coeffIndex < coeffsPerChannel; coeffIndex += 1) {
        output[cursor++] = sourceSh[channel * 15 + coeffIndex];
      }
    }
  }
}

function fillSourceSh(sourceSh, meta, sourceBands, shLabels, shCentroids, shCentroidsWidth, splatIndex) {
  sourceSh.fill(0);

  if (!sourceBands || !shLabels || !shCentroids || !meta.shN) {
    return;
  }

  const coeffsPerChannel = sourceBands === 1 ? 3 : sourceBands === 2 ? 8 : 15;
  const labelBase = splatIndex * 4;
  const label = shLabels[labelBase] + (shLabels[labelBase + 1] << 8);
  const u = (label % 64) * coeffsPerChannel;
  const v = Math.floor(label / 64);

  for (let channel = 0; channel < 3; channel += 1) {
    for (let coeffIndex = 0; coeffIndex < coeffsPerChannel; coeffIndex += 1) {
      const texelIndex =
        ((u + coeffIndex) * 4 + channel) + v * shCentroidsWidth * 4;
      sourceSh[channel * 15 + coeffIndex] = meta.shN.codebook[shCentroids[texelIndex]];
    }
  }
}

function decodeMean(meansMeta, meansLower, meansUpper, componentIndex) {
  const axis = componentIndex % 4;
  const combined = (meansUpper[componentIndex] << 8) + meansLower[componentIndex];
  const normalized = combined / 65535;
  const encoded = lerp(meansMeta.mins[axis], meansMeta.maxs[axis], normalized);
  return Math.sign(encoded) * (Math.exp(Math.abs(encoded)) - 1);
}

function decodeQuaternion(quaternionBytes, texelBase) {
  const a = (quaternionBytes[texelBase] / 255 - 0.5) * sqrt2;
  const b = (quaternionBytes[texelBase + 1] / 255 - 0.5) * sqrt2;
  const c = (quaternionBytes[texelBase + 2] / 255 - 0.5) * sqrt2;
  const d = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)));
  const mode = quaternionBytes[texelBase + 3] - 252;

  switch (mode) {
    case 0:
      return [d, a, b, c];
    case 1:
      return [a, d, b, c];
    case 2:
      return [a, b, d, c];
    case 3:
      return [a, b, c, d];
    default:
      return [d, a, b, c];
  }
}

function decodeScales(meta, scaleBytes, texelBase) {
  if (meta.version === 2) {
    return [
      meta.scales.codebook[scaleBytes[texelBase]],
      meta.scales.codebook[scaleBytes[texelBase + 1]],
      meta.scales.codebook[scaleBytes[texelBase + 2]],
    ];
  }

  return [
    lerp(meta.scales.mins[0], meta.scales.maxs[0], scaleBytes[texelBase] / 255),
    lerp(meta.scales.mins[1], meta.scales.maxs[1], scaleBytes[texelBase + 1] / 255),
    lerp(meta.scales.mins[2], meta.scales.maxs[2], scaleBytes[texelBase + 2] / 255),
  ];
}

function decodeSh0(meta, sh0Bytes, texelBase) {
  if (meta.version === 2) {
    const fDc0 = meta.sh0.codebook[sh0Bytes[texelBase]];
    const fDc1 = meta.sh0.codebook[sh0Bytes[texelBase + 1]];
    const fDc2 = meta.sh0.codebook[sh0Bytes[texelBase + 2]];
    const alpha = sh0Bytes[texelBase + 3] / 255;

    return [
      fDc0,
      fDc1,
      fDc2,
      sigmoidToLogit(alpha),
      clamp(0.5 + fDc0 * shC0, 0, 1),
      clamp(0.5 + fDc1 * shC0, 0, 1),
      clamp(0.5 + fDc2 * shC0, 0, 1),
    ];
  }

  const fDc0 = lerp(meta.sh0.mins[0], meta.sh0.maxs[0], sh0Bytes[texelBase] / 255);
  const fDc1 = lerp(meta.sh0.mins[1], meta.sh0.maxs[1], sh0Bytes[texelBase + 1] / 255);
  const fDc2 = lerp(meta.sh0.mins[2], meta.sh0.maxs[2], sh0Bytes[texelBase + 2] / 255);
  const opacityRaw = lerp(
    meta.sh0.mins[3],
    meta.sh0.maxs[3],
    sh0Bytes[texelBase + 3] / 255,
  );

  return [
    fDc0,
    fDc1,
    fDc2,
    opacityRaw,
    clamp(0.5 + fDc0 * shC0, 0, 1),
    clamp(0.5 + fDc1 * shC0, 0, 1),
    clamp(0.5 + fDc2 * shC0, 0, 1),
  ];
}

function calcBands(centroidsWidth) {
  return bandsByCentroidsWidth[centroidsWidth] ?? 0;
}

function hasEntry(archive, entryName) {
  return Object.hasOwn(archive, entryName);
}

function requireEntry(archive, entryName) {
  if (!hasEntry(archive, entryName)) {
    throw new Error(`Missing archive entry: ${entryName}`);
  }

  return archive[entryName];
}

function lerp(min, max, t) {
  return min * (1 - t) + max * t;
}

function sigmoidToLogit(value) {
  if (value <= 0) {
    return -40;
  }
  if (value >= 1) {
    return 40;
  }
  return -Math.log(1 / value - 1);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value, min, max) {
  return clamp(Number.isFinite(value) ? value : min, min, max);
}

async function writeChunk(stream, chunk) {
  if (stream.write(chunk)) {
    return;
  }

  await once(stream, "drain");
}

main().catch((error) => {
  console.error("[sog-to-ply] failed");
  console.error(error);
  process.exitCode = 1;
});
