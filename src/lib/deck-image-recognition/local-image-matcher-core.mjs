export function getLuma(red, green, blue) {
  return red * 0.299 + green * 0.587 + blue * 0.114
}

export function buildDHash(rgb, width = 9, height = 8) {
  let bits = ''

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const leftIndex = (y * width + x) * 4
      const rightIndex = (y * width + x + 1) * 4
      const left = getLuma(
        rgb[leftIndex] ?? 0,
        rgb[leftIndex + 1] ?? 0,
        rgb[leftIndex + 2] ?? 0
      )
      const right = getLuma(
        rgb[rightIndex] ?? 0,
        rgb[rightIndex + 1] ?? 0,
        rgb[rightIndex + 2] ?? 0
      )

      bits += left > right ? '1' : '0'
    }
  }

  return bits
}

export function hammingSimilarity(left, right) {
  const length = Math.min(left.length, right.length)
  let distance = 0

  for (let index = 0; index < length; index += 1) {
    if (left[index] !== right[index]) distance += 1
  }

  return 1 - distance / Math.max(1, length)
}

export function buildColorHistogram(rgba, binsPerChannel = 4) {
  const bins = new Array(binsPerChannel ** 3).fill(0)
  const binSize = 256 / binsPerChannel

  for (let index = 0; index < rgba.length; index += 4) {
    const redBin = Math.min(binsPerChannel - 1, Math.floor((rgba[index] ?? 0) / binSize))
    const greenBin = Math.min(
      binsPerChannel - 1,
      Math.floor((rgba[index + 1] ?? 0) / binSize)
    )
    const blueBin = Math.min(
      binsPerChannel - 1,
      Math.floor((rgba[index + 2] ?? 0) / binSize)
    )
    const binIndex =
      redBin * binsPerChannel * binsPerChannel + greenBin * binsPerChannel + blueBin

    bins[binIndex] += 1
  }

  return bins.map((value) => value / Math.max(1, rgba.length / 4))
}

export function histogramIntersection(left, right) {
  let intersection = 0

  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    intersection += Math.min(left[index], right[index])
  }

  return intersection
}

export function buildTemplateVector(rgba) {
  const vector = []

  for (let index = 0; index < rgba.length; index += 4) {
    vector.push(
      getLuma(rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0) / 255
    )
  }

  return vector
}

export function buildEdgeVector(rgba, width, height) {
  const luma = []
  const vector = []

  for (let index = 0; index < rgba.length; index += 4) {
    luma.push(
      getLuma(rgba[index] ?? 0, rgba[index + 1] ?? 0, rgba[index + 2] ?? 0) / 255
    )
  }

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const left = luma[y * width + x - 1] ?? 0
      const right = luma[y * width + x + 1] ?? 0
      const top = luma[(y - 1) * width + x] ?? 0
      const bottom = luma[(y + 1) * width + x] ?? 0

      vector.push(Math.min(1, Math.abs(right - left) + Math.abs(bottom - top)))
    }
  }

  return vector
}

export function templateSimilarity(left, right) {
  const length = Math.min(left.length, right.length)
  let squaredError = 0

  for (let index = 0; index < length; index += 1) {
    squaredError += (left[index] - right[index]) ** 2
  }

  const rmse = Math.sqrt(squaredError / Math.max(1, length))

  return Math.max(0, 1 - rmse)
}

export function scoreImageFeatures(candidateFeatures, referenceFeatures) {
  const perceptualHashScore = hammingSimilarity(
    candidateFeatures.perceptualHash,
    referenceFeatures.perceptualHash
  )
  const colorHistogramScore = histogramIntersection(
    candidateFeatures.colorHistogram,
    referenceFeatures.colorHistogram
  )
  const templateImageScore = templateSimilarity(
    candidateFeatures.templateVector,
    referenceFeatures.templateVector
  )
  const artTemplateScore =
    candidateFeatures.artTemplateVector && referenceFeatures.artTemplateVector
      ? templateSimilarity(
          candidateFeatures.artTemplateVector,
          referenceFeatures.artTemplateVector
        )
      : templateImageScore
  const titleTemplateScore =
    candidateFeatures.titleTemplateVector && referenceFeatures.titleTemplateVector
      ? templateSimilarity(
          candidateFeatures.titleTemplateVector,
          referenceFeatures.titleTemplateVector
        )
      : templateImageScore
  const lowerTemplateScore =
    candidateFeatures.lowerTemplateVector && referenceFeatures.lowerTemplateVector
      ? templateSimilarity(
          candidateFeatures.lowerTemplateVector,
          referenceFeatures.lowerTemplateVector
        )
      : templateImageScore
  const edgeScore =
    candidateFeatures.edgeVector && referenceFeatures.edgeVector
      ? templateSimilarity(candidateFeatures.edgeVector, referenceFeatures.edgeVector)
      : templateImageScore
  const score =
    perceptualHashScore * 0.14 +
    colorHistogramScore * 0.28 +
    templateImageScore * 0.18 +
    artTemplateScore * 0.16 +
    titleTemplateScore * 0.1 +
    lowerTemplateScore * 0.06 +
    edgeScore * 0.08

  return {
    score: Number(score.toFixed(4)),
    confidence: Number(score.toFixed(4)),
    components: {
      perceptualHash: Number(perceptualHashScore.toFixed(4)),
      colorHistogram: Number(colorHistogramScore.toFixed(4)),
      templateImageSimilarity: Number(templateImageScore.toFixed(4)),
      artTemplateSimilarity: Number(artTemplateScore.toFixed(4)),
      titleTemplateSimilarity: Number(titleTemplateScore.toFixed(4)),
      lowerTemplateSimilarity: Number(lowerTemplateScore.toFixed(4)),
      edgeSimilarity: Number(edgeScore.toFixed(4)),
      futureFeatureMatching: null,
    },
  }
}

export function createEmptyFutureFeatureMatching() {
  return {
    orb: null,
    sift: null,
    notes: 'Reserved for local feature descriptors if OpenCV-compatible support is added.',
  }
}
