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

type CachedBatchSprite = {
  readonly texture: GlTexture
  readonly x1: number
  readonly y1: number
  readonly u1: number
  readonly v1: number
  readonly x2: number
  readonly y2: number
  readonly u2: number
  readonly v2: number
  readonly x3: number
  readonly y3: number
  readonly u3: number
  readonly v3: number
  readonly x4: number
  readonly y4: number
  readonly u4: number
  readonly v4: number
}

let writingBatchCache: null | CachedBatchSprite[] = null

const activeBatchCaches: BatchCache[] = []

function refreshBatchCaches(): void {
  writingBatchCache = null
  for (let i = 0; i < activeBatchCaches.length;) {
    if (activeBatchCaches[i].checkActive()) {
      i++
    }
  }
}

class BatchCache {
  private active = false
  private usagesThisFrame = 0
  private cached: null | ReadonlyArray<CachedBatchSprite> = null

  constructor(
    private readonly content: (gl: WebGLRenderingContext) => void
  ) { }

  keepAlive(): void {
    if (!this.active) {
      activeBatchCaches.push(this)
      this.active = true
    }
    this.usagesThisFrame++
  }

  checkActive(): boolean {
    if (this.usagesThisFrame === 0) {
      activeBatchCaches.splice(activeBatchCaches.indexOf(this), 1)
      this.active = false
      this.cached = null
    }
    this.usagesThisFrame = 0
    return this.active
  }

  draw(gl: WebGLRenderingContext) {
    if (writingBatchCache !== null) {
      throw new Error(`Cannot nest BatchCache draw calls`)
    }

    this.keepAlive()

    if (this.cached === null) {
      this.cached = writingBatchCache = []
      pushTransformStack(true)
      this.content(gl)
      popTransformStack()
      writingBatchCache = null
    }

    for (const sprite of this.cached) {
      drawBatch(
        gl, sprite.texture,
        currentTransform.applyX(sprite.x1, sprite.y1), currentTransform.applyY(sprite.x1, sprite.y1), sprite.u1, sprite.v1,
        currentTransform.applyX(sprite.x2, sprite.y2), currentTransform.applyY(sprite.x2, sprite.y2), sprite.u2, sprite.v2,
        currentTransform.applyX(sprite.x3, sprite.y3), currentTransform.applyY(sprite.x3, sprite.y3), sprite.u3, sprite.v3,
        currentTransform.applyX(sprite.x4, sprite.y4), currentTransform.applyY(sprite.x4, sprite.y4), sprite.u4, sprite.v4
      )
    }
  }
}

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
  if (writingBatchCache === null) {
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
  } else {
    writingBatchCache.push({
      texture,
      x1, y1, u1, v1,
      x2, y2, u2, v2,
      x3, y3, u3, v3,
      x4, y4, u4, v4
    })
  }
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
