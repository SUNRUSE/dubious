const batchVertexData = new Float32Array(65536)
const batchVertices = new GlBuffer(
  GlConstants.ARRAY_BUFFER,
  GlConstants.DYNAMIC_DRAW,
  () => batchVertexData
)

type CachedBatchSprite = {
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

class BatchCache extends FrameCache<ReadonlyArray<CachedBatchSprite>> {
  constructor(
    private readonly content: () => void
  ) {
    super()
  }

  create(): ReadonlyArray<CachedBatchSprite> {
    if (writingBatchCache !== null) {
      throw new Error(`Cannot nest BatchCache/SpriteBatch draw calls`)
    }

    const output = writingBatchCache = []
    pushTransformStack(true)
    this.content()
    popTransformStack()
    writingBatchCache = null

    return output
  }

  update(cached: ReadonlyArray<CachedBatchSprite>): void { }

  dispose(cached: ReadonlyArray<CachedBatchSprite>): void { }

  draw() {
    for (const sprite of this.get()) {
      drawBatch(
        currentTransform.applyX(sprite.x1, sprite.y1), currentTransform.applyY(sprite.x1, sprite.y1), sprite.u1, sprite.v1,
        currentTransform.applyX(sprite.x2, sprite.y2), currentTransform.applyY(sprite.x2, sprite.y2), sprite.u2, sprite.v2,
        currentTransform.applyX(sprite.x3, sprite.y3), currentTransform.applyY(sprite.x3, sprite.y3), sprite.u3, sprite.v3,
        currentTransform.applyX(sprite.x4, sprite.y4), currentTransform.applyY(sprite.x4, sprite.y4), sprite.u4, sprite.v4
      )
    }
  }
}

const spriteBatchTransform: GlMat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1
]

class SpriteBatch extends FrameCache<null> {
  private numberOfElements: number
  private readonly buffer = new GlBuffer(
    GlConstants.ARRAY_BUFFER,
    GlConstants.STATIC_DRAW,
    () => {
      if (writingBatchCache !== null) {
        throw new Error(`Cannot nest BatchCache/SpriteBatch draw calls`)
      }

      writingBatchCache = []
      const sprites = writingBatchCache
      pushTransformStack(true)
      this.content()
      popTransformStack()
      writingBatchCache = null

      this.numberOfElements = sprites.length
      const output = new Float32Array(sprites.length * 16)
      let offset = 0
      for (const sprite of sprites) {
        output[offset++] = sprite.x1
        output[offset++] = sprite.y1
        output[offset++] = sprite.u1
        output[offset++] = sprite.v1
        output[offset++] = sprite.x2
        output[offset++] = sprite.y2
        output[offset++] = sprite.u2
        output[offset++] = sprite.v2
        output[offset++] = sprite.x3
        output[offset++] = sprite.y3
        output[offset++] = sprite.u3
        output[offset++] = sprite.v3
        output[offset++] = sprite.x4
        output[offset++] = sprite.y4
        output[offset++] = sprite.u4
        output[offset++] = sprite.v4
      }

      return output
    }
  )

  constructor(
    private readonly content: () => void
  ) {
    super()
  }

  create(): null {
    return null
  }

  update(cached: null): void { }

  dispose(cached: null): void {
    this.buffer.dispose()
  }

  draw() {
    this.get()
    basicProgramWithTransform.bind()
    this.buffer.bind()
    basicProgramWithTransform.attributes.aLocation(16, 0)
    basicProgramWithTransform.attributes.aTextureCoordinate(16, 8)
    spriteBatchTransform[0] = currentTransform.xx
    spriteBatchTransform[1] = currentTransform.yx
    spriteBatchTransform[3] = currentTransform.x
    spriteBatchTransform[4] = currentTransform.xy
    spriteBatchTransform[5] = currentTransform.yy
    spriteBatchTransform[7] = currentTransform.y
    basicProgramWithTransform.uniforms.uTransform(spriteBatchTransform)
    basicProgramWithTransform.uniforms.uTextureResolution(atlasWidth, atlasHeight)
    quadrilateralIndices.bind()
    if (basicProgramWithTransform.uniforms.uTexture(atlasTexture)) {
      gl.drawElements(GlConstants.TRIANGLES, this.numberOfElements * 6, GlConstants.UNSIGNED_SHORT, 0)
    }
  }
}

let batchProgress = 0

function drawBatch(
  x1: number, y1: number, u1: number, v1: number,
  x2: number, y2: number, u2: number, v2: number,
  x3: number, y3: number, u3: number, v3: number,
  x4: number, y4: number, u4: number, v4: number
): void {
  if (writingBatchCache === null) {
    if (batchProgress === 16384) {
      flushBatch()
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
      x1, y1, u1, v1,
      x2, y2, u2, v2,
      x3, y3, u3, v3,
      x4, y4, u4, v4
    })
  }
}

function flushBatch(): void {
  if (batchProgress === 0) {
    return
  }
  basicProgram.bind()
  batchVertices.bind()
  gl.bufferSubData(GlConstants.ARRAY_BUFFER, 0, batchVertexData.subarray(0, batchProgress * 16))
  basicProgram.attributes.aLocation(16, 0)
  basicProgram.attributes.aTextureCoordinate(16, 8)
  quadrilateralIndices.bind()
  basicProgram.uniforms.uTextureResolution(atlasWidth, atlasHeight)
  if (basicProgram.uniforms.uTexture(atlasTexture)) {
    gl.drawElements(GlConstants.TRIANGLES, batchProgress * 6, GlConstants.UNSIGNED_SHORT, 0)
  }
  batchProgress = 0
}
