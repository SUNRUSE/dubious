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

const basicProgram = new GlProgram(
  {
    uTexture: `sampler2D`
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
  }, [
    `gl_FragColor = texture2D(uTexture, vTextureCoordinate);`
  ]
)

const basicProgramWithTransform = new GlProgram(
  {
    uTexture: `sampler2D`,
    uTransform: `mat4`
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
  }, [
    `gl_FragColor = texture2D(uTexture, vTextureCoordinate);`
  ]
)
