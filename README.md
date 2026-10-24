# वंशज & अक्षमा · शुभ विवाह उत्सव (3D)

A 3D celebration page for the wedding, hosted on GitHub Pages. It is the companion to the classic invitation at <https://dreamers9935.github.io/vanshaj-weds-akshama/>.

It is a static site with no build step. The libraries load from CDNs: three.js 0.160.0, GSAP 3.12.5 and Lenis 1.1.13.

- `index.html` holds all the text, with one `<section class="sec">` per part of the invitation. Each section's `data-mood` picks its sky and 3D set piece.
- `assets/js/world.js` is the 3D world: a golden mandala, floating shapes, moving lights, stars and bloom, plus a set piece for each event:
  - lotus and diyas
  - marigolds, sunbeams and haldi dust
  - toran, kalash, stage lights and music notes
  - string lights and fireworks
  - sky lanterns
- `assets/js/fx.js` draws the 2D effects above the page: sparkles, petals, akshat, haldi powder and notes.
- `assets/js/app.js` handles:
  - the curtains and music, with the shloka lines lighting up as they are sung
  - scroll moods and the date animations
  - every interaction: haldi on the idols, akshat on the kalash, a playable dholak, fireworks and sky lanterns
- `assets/audio/music.mp3` is cut from the family's own "Wedding invitation" video. The Ganesh vandana plays once (0–15.3s), then the melody section loops.

If WebGL isn't available, the page falls back to plain gradient skies and keeps all the text and 2D effects.

## Credits

Illustrations (`ganesha-art.webp`, `haldi-bride.webp`, `hands-lotus.webp`) and the music come from the family's invitation video.

**Photos** are from [Unsplash](https://unsplash.com) under the [Unsplash License](https://unsplash.com/license):

| File | Unsplash photo |
|---|---|
| `ganesha.webp` | photo-1598090216740-eb040d8c3f82 |
| `shivling.webp` | photo-1668344500552-0bc310ed3a96 |
| `kalash.webp` | photo-1790808415654-7fe3692eb993 |
| `bg-baraat.webp` | photo-1574495780742-6d9523a0f42e |
