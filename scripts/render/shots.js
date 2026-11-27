// The photo-style renders the site uses. Each is our own sign, rendered in a planted entrance.
// Sample wording only; the owner's real photographs replace these.
const P = { green: '#1F4A3A', black: '#1E1E1E', navy: '#1E2F4D', burgundy: '#5E1F27', slate: '#47525C', bronze: '#6B5236', ivory: '#F7F5EE', white: '#FAFAF7', gold: '#B8922E', sand: '#D8CDB4' };
const sign = (o) => ({ size: '96x48', shape: 'arch', base: 'stone', pillars: 'none', lettering: 'routed', field: P.green, raised: P.ivory, sides: 1, style: 'serif', lines: ['Alder Creek'], ...o });

export const SHOTS = [
  // home hero slideshow
  { id: 'hero-alder-creek', width: 2400, height: 1200, widths: [2400, 1280, 760], light: 'golden', fov: 28,
    sign: sign({ lines: ['Alder Creek', 'Homeowners'], pillars: 'peak' }), camera: { angle: -18, height: 1.25, pan: 0.24 }, flowers: '#c9a227' },
  { id: 'hero-riverside', width: 2400, height: 1200, widths: [2400, 1280, 760], light: 'day', fov: 28,
    sign: sign({ lines: ['Riverside', 'Business Park'], shape: 'shoulder', base: 'plain', lettering: 'metal', field: P.slate, raised: P.white, style: 'sans' }), camera: { angle: 16, height: 1.3, pan: 0.24 }, flowers: '#b85aa0' },
  { id: 'hero-grace-dusk', width: 2400, height: 1200, widths: [2400, 1280, 760], light: 'dusk', fov: 28,
    sign: sign({ lines: ['Grace Fellowship', 'Church'], shape: 'arch', field: P.navy, raised: P.ivory, lit: true }), camera: { angle: -10, height: 1.2, pan: 0.24 }, flowers: '#e0e0e0' },
  // styles
  { id: 'style-arched-stone', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ lines: ['Cedar Hollow'] }), camera: { angle: -16 } },
  { id: 'style-posts', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ size: '60x36', shape: 'flat', base: 'posts', lines: ['Willow Bend'], field: P.black, raised: P.gold, trim: '#1E1E1E' }), camera: { angle: 12 } },
  { id: 'style-pillars', width: 1200, height: 900, widths: [1200, 880, 640], light: 'golden', sign: sign({ shape: 'flat', pillars: 'peak', lines: ['Stonegate'], field: P.burgundy }), camera: { angle: -12 } },
  { id: 'style-shouldered', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ shape: 'shoulder', lines: ['Oak Ridge', 'Estates'], field: P.bronze, raised: P.sand }), camera: { angle: 14 } },
  { id: 'style-metal', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ shape: 'flat', base: 'plain', lettering: 'metal', lines: ['Northgate', 'Commons'], field: P.black, style: 'sans' }), camera: { angle: -20 } },
  { id: 'style-acrylic', width: 1200, height: 900, widths: [1200, 880, 640], light: 'golden', sign: sign({ shape: 'flat', lettering: 'acrylic', lines: ['The Willows'], field: P.navy, raised: P.white }), camera: { angle: 18 } },
  { id: 'style-double', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ sides: 2, lines: ['Maple Grove'], field: P.green }), camera: { angle: 52, height: 1.4 } },
  { id: 'style-illuminated', width: 1200, height: 900, widths: [1200, 880, 640], light: 'dusk', sign: sign({ lines: ['Lakeview'], lit: true, field: P.black, raised: P.white }), camera: { angle: -8 } },
  // industries
  { id: 'ind-hoa', width: 1200, height: 800, widths: [1200, 880, 640], light: 'golden', sign: sign({ lines: ['Sycamore Park'], pillars: 'flat' }), camera: { angle: 10 } },
  { id: 'ind-church', width: 1200, height: 800, widths: [1200, 880, 640], light: 'day', sign: sign({ shape: 'peak', lines: ['St. Andrew', 'Parish'], field: P.burgundy, raised: P.ivory }), camera: { angle: -14 } },
  { id: 'ind-school', width: 1200, height: 800, widths: [1200, 880, 640], light: 'day', sign: sign({ shape: 'flat', pillars: 'flat', lines: ['Westbrook', 'Elementary'], field: P.navy, raised: P.gold }), camera: { angle: 15 } },
  { id: 'ind-business', width: 1200, height: 800, widths: [1200, 880, 640], light: 'day', sign: sign({ shape: 'flat', base: 'plain', lettering: 'metal', lines: ['Harbor Point', 'Office Park'], field: P.slate, style: 'sans' }), camera: { angle: -18 } },
  { id: 'ind-apartments', width: 1200, height: 800, widths: [1200, 880, 640], light: 'golden', sign: sign({ shape: 'shoulder', lettering: 'acrylic', lines: ['The Residences', 'at Elm Street'], field: P.black, raised: P.gold }), camera: { angle: 12 } },
  { id: 'ind-parks', width: 1200, height: 800, widths: [1200, 880, 640], light: 'day', sign: sign({ size: '72x42', shape: 'arch', base: 'posts', lines: ['Fox Run', 'Park'], field: P.bronze, raised: P.sand }), camera: { angle: -12 } },
  // gallery extras
  { id: 'gal-1', width: 1200, height: 900, widths: [1200, 880, 640], light: 'golden', sign: sign({ lines: ['Brookfield'], pillars: 'peak', field: P.navy }), camera: { angle: 24 } },
  { id: 'gal-2', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ size: '72x42', shape: 'peak', lines: ['Hidden Pines'], field: P.green, raised: P.gold }), camera: { angle: -24 } },
  { id: 'gal-3', width: 1200, height: 900, widths: [1200, 880, 640], light: 'day', sign: sign({ size: '48x30', shape: 'arch', base: 'posts', lines: ['Rosewood'], field: P.burgundy }), camera: { angle: 8 } },
];
