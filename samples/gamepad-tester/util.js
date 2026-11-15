export const clamp = (v, min, max) => Math.max(min, Math.min(max, v))

export function randomStar(w, h, colors) {
  const r = (10 + Math.random() * 10) * devicePixelRatio
  return {
    x: r + Math.random() * (w - 2 * r),
    y: r + Math.random() * (h - 2 * r),
    r,
    color: colors[Math.floor(Math.random() * colors.length)]
  }
}
