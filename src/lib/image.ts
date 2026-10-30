/** Read an image file and downscale it to a JPEG data URL so it fits in localStorage. */
export function fileToDataUrl(file: File, max = 900, q = 0.78): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onerror = rej
    r.onload = () => {
      const img = new Image()
      img.onerror = rej
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        res(c.toDataURL('image/jpeg', q))
      }
      img.src = r.result as string
    }
    r.readAsDataURL(file)
  })
}
