// Draws the lineup page: every style function gets one tile. Sets document.title to 'ready' when done,
// so a capture script knows when to take the picture.
import * as styles2d from './styles2d.js'

const NAMES = {
  flatVector: 'Lit vector',
  storybook: 'Storybook gouache',
  comic: 'Comic halftone',
  watercolour: 'Watercolour',
  neon: 'Neon',
  pixel: 'Pixel art',
  lowPoly: 'Low-poly',
  toon: 'Toon / cel',
  clay: 'Claymation',
  papercraft: 'Papercraft',
  voxel: 'Voxel',
  ps1: 'PS1-era'
}
const query = new URLSearchParams(location.search)
const one = query.get('one')
const only = one ? [one] : query.get('only')?.split(',')
const grid = document.getElementById('grid')
if (one) document.body.classList.add('one')

let styles = { ...styles2d }
try {
  styles = { ...styles, ...(await import('./styles3d.js')) }
} catch (error) {
  const note = document.createElement('p')
  note.className = 'note'
  note.textContent = 'The 3D styles need three.js next to this page (see the comment at the top of lineup.html). ' + error.message
  document.body.prepend(note)
}

for (const [id, draw] of Object.entries(styles)) {
  if (typeof draw !== 'function' || !NAMES[id] || (only && !only.includes(id))) continue
  const figure = document.createElement('figure')
  const canvas = draw()
  canvas.dataset.style = id
  const caption = document.createElement('figcaption')
  caption.textContent = NAMES[id]
  figure.append(canvas, caption)
  grid.append(figure)
  await new Promise((resolve) => setTimeout(resolve)) // let the page paint between styles
}
document.title = 'ready'
