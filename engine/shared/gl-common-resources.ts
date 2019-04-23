const quadrilateralIndices = new GlBuffer(
  GlConstants.ELEMENT_ARRAY_BUFFER,
  GlConstants.STATIC_DRAW,
  () => {
    const output = new Uint16Array(98304)
    for (let quad = 0; quad < 16384; quad++) {
      output[quad * 6] = quad * 4
      output[quad * 6 + 1] = quad * 4 + 1
      output[quad * 6 + 2] = quad * 4 + 2
      output[quad * 6 + 3] = quad * 4 + 2
      output[quad * 6 + 4] = quad * 4 + 3
      output[quad * 6 + 5] = quad * 4
    }
    return output
  }
)

const basicFragmentSource = [
  `vec2 nnTextureCoordinate = vTextureCoordinate;`,
  `vec2 npTextureCoordinate = vTextureCoordinate + dFdy(vTextureCoordinate);`,
  `vec2 pnTextureCoordinate = vTextureCoordinate + dFdx(vTextureCoordinate);`,
  `vec2 ppTextureCoordinate = vTextureCoordinate + dFdx(vTextureCoordinate) + dFdy(vTextureCoordinate);`,
  `vec2 lowerTextureCoordinate = min(nnTextureCoordinate, min(npTextureCoordinate, min(pnTextureCoordinate, ppTextureCoordinate)));`,
  `vec2 upperTextureCoordinate = max(nnTextureCoordinate, max(npTextureCoordinate, max(pnTextureCoordinate, ppTextureCoordinate)));`,
  `vec2 nearestPixelTextureCoordinate = ceil(lowerTextureCoordinate * uTextureResolution) / uTextureResolution;`,
  `vec2 blendWeights = clamp((upperTextureCoordinate - nearestPixelTextureCoordinate) / (upperTextureCoordinate - lowerTextureCoordinate), 0.0, 1.0);`,
  `vec4 nnSample = texture2D(uTexture, lowerTextureCoordinate);`,
  `vec4 npSample = texture2D(uTexture, vec2(lowerTextureCoordinate.x, upperTextureCoordinate.y));`,
  `vec4 pnSample = texture2D(uTexture, vec2(upperTextureCoordinate.x, lowerTextureCoordinate.y));`,
  `vec4 ppSample = texture2D(uTexture, upperTextureCoordinate);`,
  `gl_FragColor = mix(mix(nnSample, npSample, blendWeights.y), mix(pnSample, ppSample, blendWeights.y), blendWeights.x);`
]

const basicProgram = new GlProgram(
  {
    uTexture: `sampler2D`,
    uTextureResolution: `vec2`
  }, {
    aLocation: {
      size: 2,
      type: GlConstants.FLOAT,
      normalized: false
    },
    aTextureCoordinate: {
      size: 2,
      type: GlConstants.FLOAT,
      normalized: true
    }
  }, [
    `vTextureCoordinate = aTextureCoordinate;`,
    `gl_Position = vec4(aLocation, 0.0, 1.0);`
  ], {
    vTextureCoordinate: 2
  }, basicFragmentSource
)

const basicProgramWithTransform = new GlProgram(
  {
    uTexture: `sampler2D`,
    uTransform: `mat4`,
    uTextureResolution: `vec2`
  }, {
    aLocation: {
      size: 2,
      type: GlConstants.FLOAT,
      normalized: false
    },
    aTextureCoordinate: {
      size: 2,
      type: GlConstants.FLOAT,
      normalized: true
    }
  }, [
    `vTextureCoordinate = aTextureCoordinate;`,
    `gl_Position = vec4(aLocation, 0.0, 1.0) * uTransform;`
  ], {
    vTextureCoordinate: 2
  }, basicFragmentSource
)
