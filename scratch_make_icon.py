import math
import os
from PIL import Image, ImageDraw

def create_daisy_flower(size=512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size / 2.0
    
    num_petals = 12
    petal_len = size * 0.38
    petal_w = size * 0.125
    
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        dist = size * 0.25
        
        p_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        bbox = [center - petal_w / 2, center - dist - petal_len / 2, center + petal_w / 2, center - dist + petal_len / 2]
        p_draw.ellipse(bbox, fill=(255, 255, 255, 255), outline=(225, 225, 225, 255), width=int(size * 0.012))
        p_rotated = p_img.rotate(-math.degrees(angle) - 90, resample=Image.Resampling.BICUBIC, center=(center, center))
        img = Image.alpha_composite(img, p_rotated)
        draw = ImageDraw.Draw(img)

    disc_radius = size * 0.18
    for r in range(int(disc_radius), 0, -1):
        ratio = r / disc_radius
        red = int(255 * ratio + 255 * (1 - ratio))
        green = int(160 * ratio + 220 * (1 - ratio))
        blue = int(10 * ratio + 40 * (1 - ratio))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(red, green, blue, 255))
        
    return img

print("Generating high-resolution Daisy flower for icon...")
daisy_512 = create_daisy_flower(512)

# Save as PNG
icon_png_path = "launcher/build/icon.png"
daisy_512.save(icon_png_path)
print("Saved", icon_png_path)

# Generate multi-size .ico (16, 24, 32, 48, 64, 128, 256)
icon_ico_path = "launcher/build/icon.ico"
sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
daisy_512.save(icon_ico_path, format="ICO", sizes=sizes)
print("Saved multi-resolution .ico to", icon_ico_path)

# Also update daisy-logo.png and daisy-client.png in assets
for p in ["launcher/src/assets/daisy-logo.png", "launcher/src/assets/daisy-client.png"]:
    daisy_512.save(p)
    print("Updated", p)

print("Icons successfully generated!")

