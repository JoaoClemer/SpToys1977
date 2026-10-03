declare module 'heic-decode' {
  interface DecodedImage {
    width: number
    height: number
    /** RGBA, 4 bytes por pixel */
    data: Uint8ClampedArray
  }
  function decode(opts: { buffer: Buffer | Uint8Array }): Promise<DecodedImage>
  export default decode
}
