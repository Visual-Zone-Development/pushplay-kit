# Asset sources and their licences

Checked on each source's own licence, terms or FAQ page on 17 Nov 2026.
Licences change, and many sites set them per item, so open the item's page
before you ship it. **UNVERIFIED** means the page couldn't be read when this
was written; read it yourself before relying on the row.

## 3D models and animations

| Source | What | Price | Licence | Commercial | Credit | Gotchas |
|---|---|---|---|---|---|---|
| [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) | Rigged humanoids, animations | Free (Adobe account) | Adobe terms | Yes: "royalty free for personal, commercial, and non-profit projects", video games included | Not required | Bipeds only. Only the last character is stored, so save your downloads |
| [Kenney](https://kenney.nl/support) | 2D, 3D, UI, audio | Free | CC0 | Yes | No | Don't use the Kenney logo by itself |
| [Quaternius](https://quaternius.com/license.html) | Low-poly 3D, animations | Free | Quaternius Asset License | Yes | No | No reselling or redistributing the assets themselves |
| [KayKit](https://kaylousberg.itch.io/) | Low-poly 3D | Free or paid | CC0, per pack | Yes | No | Asks you not to resell unmodified copies |
| [Poly Pizza](https://poly.pizza/docs/tos) | Low-poly 3D | Free | Creative Commons, per model | Per model | Per model | Check each model's CC variant |
| [Sketchfab](https://sketchfab.com/licenses) | 3D | Free or paid | Standard, CC BY / BY-SA / BY-ND / BY-NC, CC0, Editorial | Standard and CC (not NC): yes. NC and Editorial: no | CC (except CC0): yes | The licence you downloaded under stays in force |
| [Fab](https://dev.epicgames.com/documentation/en-us/fab/licenses-and-pricing-in-fab) (Epic) | 3D, materials, audio | Free or paid | Fab Standard (Personal or Professional tier by revenue) or CC BY | Yes | Standard: no. CC BY: yes | Not limited to Unreal. No standalone redistribution. NoAI items stay out of AI datasets. Epic-owned content (Megascans, MetaHumans) may be Unreal-only: **UNVERIFIED** |
| [Unity Asset Store](https://unity.com/legal/as-terms) | Everything | Free or paid | Asset Store EULA | Yes, except "Restricted" assets | No | Other engines allowed if you follow the EULA. Assets only as embedded in the product. No AI/ML training |
| [Synty](https://syntystore.com/pages/end-user-licence-agreement) | Low-poly packs | Paid | Synty Standard Licence | Yes | Not stated | Any engine or platform. 5 seats (Humble copies: 1). No AI datasets; don't feed its files to AI 3D generators |
| [itch.io](https://itch.io/game-assets) | Everything | Free or paid | Set by each creator | Per pack | Per pack | Filter by the "Royalty Free" tag, then read the pack's own licence |
| Humble Bundle | Asset bundles | Paid | Each publisher's EULA | Per item | Per item | Humble's own terms: **UNVERIFIED** |
| [CGTrader](https://www.cgtrader.com/pages/terms-and-conditions) | 3D | Free or paid | Royalty Free (default "No AI") | Yes | No | Must take reasonable measures so end users can't extract the model, which is hard on the web. No ML training |
| [TurboSquid](https://blog.turbosquid.com/royalty-free-license/) | 3D | Paid | Royalty Free | Yes, games included | No | Models must ship in a form that can't be extracted without reverse engineering. Editorial items can't go in games |

## Textures, materials, HDRIs

| Source | Licence | Commercial | Credit | Gotchas |
|---|---|---|---|---|
| [Poly Haven](https://polyhaven.com/license) | CC0 | Yes | No | Files may be redistributed. Site logos and example renders aren't CC0 |
| [ambientCG](https://docs.ambientcg.com/license/) | CC0 1.0 | Yes | No | Raw files may ship in a game |

## AI 3D generation

| Service | Free tier | Paid plans |
|---|---|---|
| [Meshy](https://www.meshy.ai/terms-of-use) | Meshy owns the output and licenses it to you as CC BY 4.0: credit Meshy. Outputs aren't private. Anything posted to Community becomes CC0 | You own the output and can keep it private. AI output may not qualify for IP protection |
| Tripo | **UNVERIFIED**: reported as Tripo keeping rights to free outputs, which are public under CC BY 4.0 | **UNVERIFIED**: reported as full rights for paid users |

## Sound effects

| Source | Licence | Commercial | Credit | Gotchas |
|---|---|---|---|---|
| [Sonniss GDC bundle](https://sonniss.com/gdc-bundle-license/) (free every year, often 20+ GB) | Royalty-free, unlimited users | Yes | No | Can't pass the sounds on as sound effects (no sound packs, no raw files in an open repo). No AI training |
| [freesound](https://freesound.org/help/faq/) | CC0, CC BY, CC BY-NC, Sampling+ (per sound) | CC0 and BY: yes. NC and Sampling+: no | BY and NC: yes | Filter by licence before choosing |
| [Kenney audio](https://kenney.nl/assets) | CC0 | Yes | No | Small but clean UI and impact sets |
| [Pixabay](https://pixabay.com/service/license-summary/) (also music) | Pixabay Content License | Yes | No | No selling or distributing the files by themselves |
| [Soundly](https://getsoundly.com/faq/can-i-use-the-sounds-in-a-video-game/) | Soundly EULA | Yes, games included | Not stated | Its Freesound add-on mixes licences: switch it to CC0 only |
| ZapSplat | Standard licence | **UNVERIFIED** | **UNVERIFIED**: reported as credit for free accounts, none for paid | none |

## Music

| Source | Licence | Commercial | Credit | Gotchas |
|---|---|---|---|---|
| [Incompetech](https://incompetech.com/music/royalty-free/faq.html) (Kevin MacLeod) | CC BY 4.0, or a paid licence without credit | Yes | Yes: a credits screen in the game | Ask him to whitelist a track for streaming |
| [Tallbeard Music Loop Bundle](https://tallbeard.itch.io/music-loop-bundle) | CC0 | Yes | No | Asks for no NFT, AI or unmodified resale use |
| [OpenGameArt](https://opengameart.org) | Mixed (CC0, BY, BY-SA, GPL, OGA-BY) | Per item | Per item | Prefer CC0 and BY; BY-SA and GPL may affect a closed game |
| Epidemic Sound | Subscription | **UNVERIFIED** for use inside a published game | **UNVERIFIED** | Read the licence terms before using it in a game |

## Fonts

[Google Fonts](https://github.com/google/fonts): mostly SIL OFL 1.1, so
commercial use and bundling in a game are allowed. Include the licence file
with the font. You can't sell the font by itself, and a modified font with a
Reserved Font Name must be renamed.

## Store disclosure

Steam's Content Survey requires disclosing AI-generated content that ships in
the game (art, sound, text, models), plus any content generated live and its
guardrails. AI used only as a development tool (for example, writing code) is
outside it. Other stores have their own rules; check before release.
