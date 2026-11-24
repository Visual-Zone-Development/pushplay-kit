# <Style name>

A starting point, not a rulebook: the game's own references and `STYLE.md` win.

<One or two sentences: where the look comes from and what it is good for.>

## Reads as

The three or four things that make this style recognisable at a glance. If a frame has them, it is in the style.

- …

## Shapes and materials

What everything is made of, the shape language (round, angular, chunky), how thick or thin things are, and what
level of detail the style keeps or throws away.

## Palette

The rules (how many colours, how saturated, where the darkest and lightest values go, how shadows are tinted)
and one example palette in hex. Rules first: the game picks its own colours.

## Light and shading

Where the light comes from, how many tones a form gets, whether shading is hard or soft, what colour shadows
are. Written as behaviour, so it can be built as a shader, a material, a texture or a drawing habit.

## Surface and finish

Textures and the finishing pass over the frame (grain, dots, blur, dither), each with its cost on a handheld
with an integrated GPU and a cheaper fallback.

## Characters and props

How this style treats the built forms from model-asset's forms.md: which details it keeps, which it drops, what
it exaggerates, and the smallest size at which a feature still reads. One paragraph each for a character, a
tree or plant, and a building or prop is a good shape.

## Motion

Frame rate or stepping, what wobbles or boils, easing, and what stays still.

## UI and type

What menus and panels are made of in this world, and what kind of typeface suits it (open licences only).

## Pitfalls

What makes it look fake or cheap, as a list of things to check in a render.

## Variants

Named looks that are this sheet with a few rules changed, each in two or three lines.

## STYLE.md block

```md
## Scene look: <style name>
- **Reads as:** …
- **Materials:** …
- **Palette:** …
- **Light:** …
- **Finish:** …
- **Line / edge:** …
- **Motion:** …
```

## In a web game

Which toolkit function shows it, the order of its passes, and the few lines of canvas or three.js that matter.
Browser-only names live here and nowhere above.

Technique sources: <links to the skills, write-ups or open-source projects the rules came from>.
