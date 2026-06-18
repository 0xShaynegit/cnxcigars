from PIL import Image
import os, glob, shutil

SRC = os.path.dirname(os.path.abspath(__file__))
ARCH = os.path.join(SRC, '..', '_archive', 'raw-images')
PFX = 'cnxcigars-cnx-cigars-'

# keeper: old_short -> (new_base, max_width, webp_quality)
# max_width caps the LONG edge isn't used; we cap WIDTH and scale height proportionally.
HERO_W = 1600
CARD_W = 1100
PORT_W = 1000
MACRO_W = 1000
DETAIL_W = 900
SMALL_W = 700

keepers = {
 # hero / wide ambiance
 'lounge-bar-interior':        ('lounge-hero-wide', HERO_W, 78),
 'busy-bar-night':             ('lounge-busy-night', CARD_W, 80),
 'lounge-warm-interior':       ('lounge-warm-interior', CARD_W, 80),
 'lounge-green-velvet-seating':('lounge-green-velvet', CARD_W, 80),
 'lounge-seating-area':        ('lounge-seating-area', CARD_W, 80),
 'lounge-booth-seating':       ('lounge-booth-seating', CARD_W, 80),
 'lounge-stage-area':          ('lounge-stage-area', CARD_W, 80),
 'lounge-interior-view':       ('lounge-interior-view', CARD_W, 80),
 'lounge-boxer-statue-decor':  ('lounge-decor-statue', SMALL_W, 80),
 'lounge-bronze-face-sculpture':('lounge-decor-sculpture', SMALL_W, 80),
 # founder / team
 'founder-portrait-red-blazer':('founder-amir-nadimi', PORT_W, 82),
 'owner-portrait-suit':        ('founder-amir-suit', PORT_W, 82),
 'owner-smiling-suit':         ('founder-amir-smiling', PORT_W, 82),
 'founder-event-portrait':     ('founder-amir-event', PORT_W, 82),
 'owner-with-cigar-box':       ('founder-amir-with-cigars', CARD_W, 80),
 'staff-team-lounge':          ('team-staff-group', CARD_W, 80),
 'staff-in-humidor':           ('team-staff-humidor', CARD_W, 80),
 'staff-with-cheese-platter':  ('team-staff-platter', SMALL_W, 80),
 # macro cigar / humidor / collection
 'premium-cigars-closeup-row': ('cigar-macro-romeo-y-julieta', MACRO_W, 82),
 'cigar-box-display':          ('cigar-box-display', MACRO_W, 80),
 'cigar-on-display-stand':     ('cigar-on-stand', MACRO_W, 80),
 'cigar-band-closeup':         ('cigar-band-macro', MACRO_W, 82),
 'walk-in-humidor-display':    ('humidor-walk-in', CARD_W, 80),
 'humidor-wall-display':       ('humidor-wall-display', CARD_W, 80),
 'humidor-shelves-stocked':    ('humidor-shelves', CARD_W, 80),
 'customer-browsing-humidor':  ('humidor-customer-browsing', CARD_W, 80),
 'open-cigar-humidor-box':     ('humidor-open-box', SMALL_W, 80),
 'league-of-fat-bastards-box': ('cigar-house-blend-box', MACRO_W, 80),
 'inca-secret-blend-box':      ('cigar-inca-blend-box', SMALL_W, 82),
 'ramon-allones-cigar-box':    ('cigar-ramon-allones-box', SMALL_W, 80),
 'gift-box-cigars-packaging':  ('cigar-gift-box', SMALL_W, 82),
 # detail / ritual
 'cigar-and-whisky-pairing':   ('ritual-cigar-whisky-pairing', DETAIL_W, 82),
 'cutting-a-cigar':            ('ritual-cutting-cigar', DETAIL_W, 82),
 'cigar-cutters-display':      ('ritual-cutters-display', DETAIL_W, 82),
 'cigar-tools-on-counter':     ('ritual-tools-counter', DETAIL_W, 82),
 'cigar-accessories-flatlay':  ('ritual-accessories-flatlay', DETAIL_W, 82),
 'lighting-a-cigar':           ('ritual-cutter-in-hand', DETAIL_W, 82),
 'gentleman-in-armchair-with-cigar':('ritual-gentleman-armchair', DETAIL_W, 82),
 # bar / hospitality (services / B2B)
 'bar-spirits-shelf':          ('bar-spirits-shelf', CARD_W, 80),
 'guinness-pour-at-bar':       ('bar-guinness-pour', SMALL_W, 82),
 'whisky-bottles-festive-display':('bar-whisky-display', SMALL_W, 80),
 'charcuterie-food-platter':   ('food-charcuterie-platter', SMALL_W, 82),
 # events / people / social proof
 'guests-relaxing-lounge':     ('guests-relaxing', CARD_W, 80),
 'guests-social-evening':      ('guests-social-evening', CARD_W, 80),
 'group-gathering-table':      ('guests-gathering', CARD_W, 80),
 'staff-and-guests-group':     ('guests-staff-group', CARD_W, 80),
 'grand-honors-on-stage':      ('event-grand-honors-stage', CARD_W, 80),
 'grand-honors-group-on-stage':('event-grand-honors-group', CARD_W, 80),
 'award-celebration':          ('event-award-celebration', CARD_W, 80),
 # awards / logos (PNG-like flats kept as webp+jpg; logos high q)
 'restaurant-guru-excellent-service-award':('award-restaurant-guru-2026', SMALL_W, 85),
 'restaurant-guru-award-badge':('award-restaurant-guru-badge', 505, 88),
 'logo-elephant-black':        ('logo', 960, 90),
 'logo-elephant-circle':       ('logo-mark-small', 200, 92),
 'logo-gold-leaf-emblem':      ('logo-gold-leaf', 1024, 88),
}

# Anything not a keeper gets archived (moved). Build reject list = all minus keepers.
all_files = {f[len(PFX):-5]: PFX+f[len(PFX):] for f in [os.path.basename(p) for p in glob.glob(os.path.join(SRC,'*.webp'))] if f.startswith(PFX)}

results = []
for short, fname in sorted(all_files.items()):
    src_path = os.path.join(SRC, fname)
    if short in keepers:
        base, maxw, q = keepers[short]
        im = Image.open(src_path).convert('RGB')
        w, h = im.size
        if w > maxw:
            nh = round(h * maxw / w)
            im = im.resize((maxw, nh), Image.LANCZOS)
        nw, nh = im.size
        webp = os.path.join(SRC, base + '.webp')
        jpg = os.path.join(SRC, base + '.jpg')
        im.save(webp, 'WEBP', quality=q, method=6)
        im.save(jpg, 'JPEG', quality=max(q-4,72), optimize=True, progressive=True)
        results.append((base, nw, nh, os.path.getsize(webp), os.path.getsize(jpg)))
        os.remove(src_path)  # remove the old double-prefixed source after reprocessing
    else:
        shutil.move(src_path, os.path.join(ARCH, fname))

# og-default 1200x630 cropped from hero source we just made
hero = Image.open(os.path.join(SRC,'lounge-hero-wide.webp')).convert('RGB')
tw, th = 1200, 630
sw, sh = hero.size
scale = max(tw/sw, th/sh)
hero2 = hero.resize((round(sw*scale), round(sh*scale)), Image.LANCZOS)
left = (hero2.size[0]-tw)//2; top=(hero2.size[1]-th)//2
og = hero2.crop((left, top, left+tw, top+th))
og.save(os.path.join(SRC,'og-default.jpg'),'JPEG',quality=82,optimize=True,progressive=True)
og.save(os.path.join(SRC,'og-default.webp'),'WEBP',quality=80,method=6)
results.append(('og-default',1200,630,os.path.getsize(os.path.join(SRC,'og-default.webp')),os.path.getsize(os.path.join(SRC,'og-default.jpg'))))

print('KEPT',len(results))
for r in sorted(results):
    print(f'{r[1]}x{r[2]}\twebp {r[3]//1024}KB\tjpg {r[4]//1024}KB\t{r[0]}')
print('ARCHIVED', len(all_files)-len(keepers))
