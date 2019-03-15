type GlTextureTarget =
  | GlConstants.TEXTURE_2D
  | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_X
  | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_X
  | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_Y
  | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_Y
  | GlConstants.TEXTURE_CUBE_MAP_POSITIVE_Z
  | GlConstants.TEXTURE_CUBE_MAP_NEGATIVE_Z

type GlTextureFormat =
  | GlConstants.ALPHA
  | GlConstants.RGB
  | GlConstants.RGBA
  | GlConstants.LUMINANCE
  | GlConstants.LUMINANCE_ALPHA

type GlTextureType =
  | GlConstants.UNSIGNED_BYTE
  | GlConstants.UNSIGNED_SHORT_5_6_5
  | GlConstants.UNSIGNED_SHORT_4_4_4_4
  | GlConstants.UNSIGNED_SHORT_5_5_5_1

type GlTextureWrap =
  | GlConstants.REPEAT
  | GlConstants.CLAMP_TO_EDGE
  | GlConstants.MIRRORED_REPEAT

type GlTextureMinFilter =
  | GlConstants.LINEAR
  | GlConstants.NEAREST

type GlTextureMagFilter =
  | GlConstants.LINEAR
  | GlConstants.NEAREST
  | GlConstants.NEAREST_MIPMAP_NEAREST
  | GlConstants.LINEAR_MIPMAP_NEAREST
  | GlConstants.NEAREST_MIPMAP_LINEAR
  | GlConstants.LINEAR_MIPMAP_LINEAR

type GlTexture = {
  bind(gl: WebGLRenderingContext): void
}
