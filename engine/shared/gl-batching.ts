const batchVertexData = new Float32Array(65536)
const batchVertices = new GlBuffer(
  GlConstants.ARRAY_BUFFER,
  GlConstants.DYNAMIC_DRAW,
  () => batchVertexData
)
const batchIndices = new GlBuffer(
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
const batchProgram = new GlProgram(
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
let batchTexture: null | GlTexture = null
let batchProgress = 0

function drawBatch(
  gl: WebGLRenderingContext,
  texture: GlTexture,
  x1: number, y1: number, u1: number, v1: number,
  x2: number, y2: number, u2: number, v2: number,
  x3: number, y3: number, u3: number, v3: number,
  x4: number, y4: number, u4: number, v4: number
): void {
  if (texture !== batchTexture) {
    flushBatch(gl)
    batchTexture = texture
  } else if (batchProgress === 16384) {
    flushBatch(gl)
  }

  let vertexIndex = batchProgress * 16
  batchVertexData[vertexIndex++] = x1
  batchVertexData[vertexIndex++] = y1
  batchVertexData[vertexIndex++] = u1
  batchVertexData[vertexIndex++] = v1
  batchVertexData[vertexIndex++] = x2
  batchVertexData[vertexIndex++] = y2
  batchVertexData[vertexIndex++] = u2
  batchVertexData[vertexIndex++] = v2
  batchVertexData[vertexIndex++] = x3
  batchVertexData[vertexIndex++] = y3
  batchVertexData[vertexIndex++] = u3
  batchVertexData[vertexIndex++] = v3
  batchVertexData[vertexIndex++] = x4
  batchVertexData[vertexIndex++] = y4
  batchVertexData[vertexIndex++] = u4
  batchVertexData[vertexIndex++] = v4
  batchProgress++
}

function flushBatch(gl: WebGLRenderingContext): void {
  if (batchTexture === null || batchProgress === 0) {
    return
  }
  batchProgram.bind(gl)
  batchVertices.bind(gl)
  gl.bufferSubData(GlConstants.ARRAY_BUFFER, 0, batchVertexData.subarray(0, batchProgress * 16))
  batchProgram.attributes.aLocation(gl, 16, 0)
  batchProgram.attributes.aTextureCoordinate(gl, 16, 8)
  batchIndices.bind(gl)
  batchProgram.uniforms.uTexture(gl, batchTexture)
  gl.drawElements(GlConstants.TRIANGLES, batchProgress * 6, GlConstants.UNSIGNED_SHORT, 0)
  batchProgress = 0
}
