from PIL import Image, ImageDraw
import os

os.makedirs('public', exist_ok=True)
for s in (192, 512):
    im = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=(15, 118, 110, 255))
    p, w = int(s * 0.22), int(s * 0.56)
    d.rounded_rectangle([p, int(s * 0.17), p + w, int(s * 0.85)], radius=int(s * 0.035), fill=(255, 255, 255, 255))
    l, r = p + int(w * 0.14), p + int(w * 0.86)
    top, step = int(s * 0.28), int(s * 0.095)
    for i in range(4):
        d.rounded_rectangle([l, top + i * step, r, top + i * step + int(s * 0.026)],
                            radius=int(s * 0.012), fill=(15, 118, 110, 255 if i < 3 else 170))
    ax, ay, aw = int(s * 0.5), int(s * 0.62), int(s * 0.10)
    d.polygon([(ax - aw, ay), (ax + aw, ay), (ax, ay + int(s * 0.13))], fill=(217, 119, 6, 255))
    d.rectangle([ax - int(s * 0.022), int(s * 0.5), ax + int(s * 0.022), ay], fill=(217, 119, 6, 255))
    im.save(f'public/icon-{s}.png')
    print('icon', s)
