from PIL import Image
import os

src = Image.open('public/logo-source.webp').convert('RGBA')
os.makedirs('public', exist_ok=True)

for size in (192, 512):
    src.resize((size, size), Image.LANCZOS).save(f'public/icon-{size}.png')

# نسخة maskable: الشعار داخل مساحة آمنة على خلفية لون الثيم
mask = Image.new('RGBA', (512, 512), (15, 118, 110, 255))
inner = src.resize((390, 390), Image.LANCZOS)
mask.alpha_composite(inner, (61, 61))
mask.save('public/icon-maskable-512.png')

src.resize((320, 320), Image.LANCZOS).save('public/logo.png')
print('icons ready')
