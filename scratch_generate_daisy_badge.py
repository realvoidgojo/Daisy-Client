import math
import shutil
import os
from PIL import Image, ImageDraw

def create_daisy_flower(size=512):
    # Create RGBA canvas
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size / 2.0
    
    # Outer petals
    num_petals = 12
    petal_len = size * 0.38
    petal_w = size * 0.12
    
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        
        # Center of petal ellipse
        dist = size * 0.26
        cx = center + cos_a * dist
        cy = center + sin_a * dist
        
        # We can draw high-res petals with a slight gradient or pure white with subtle shading
        # Draw rotated ellipse via polygon or high-res rotated overlay
        p_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        # Petal aligned vertically at center
        bbox = [center - petal_w / 2, center - dist - petal_len / 2, center + petal_w / 2, center - dist + petal_len / 2]
        p_draw.ellipse(bbox, fill=(255, 255, 255, 255), outline=(230, 230, 230, 255), width=int(size * 0.01))
        # Rotate
        p_rotated = p_img.rotate(-math.degrees(angle) - 90, resample=Image.Resampling.BICUBIC, center=(center, center))
        img = Image.alpha_composite(img, p_rotated)
        draw = ImageDraw.Draw(img)

    # Center golden/yellow disc
    disc_radius = size * 0.18
    # Subtle radial shade
    for r in range(int(disc_radius), 0, -1):
        ratio = r / disc_radius
        # Center is brighter yellow #FFE033, outer disc is warm amber #E69500
        red = int(255 * ratio + 255 * (1 - ratio))
        green = int(160 * ratio + 220 * (1 - ratio))
        blue = int(10 * ratio + 40 * (1 - ratio))
        draw.ellipse([center - r, center - r, center + r, center + r], fill=(red, green, blue, 255))
        
    return img

def create_badge(size=32):
    # Create 32x32 pixel-crisp daisy flower badge
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size / 2.0
    
    # 8 petals for small 32x32 icon
    num_petals = 8
    petal_len = 9.0
    petal_w = 4.0
    dist = 7.0
    
    for i in range(num_petals):
        angle = (2 * math.pi / num_petals) * i
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)
        
        p_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        bbox = [center - petal_w / 2, center - dist - petal_len / 2, center + petal_w / 2, center - dist + petal_len / 2]
        p_draw.ellipse(bbox, fill=(255, 255, 255, 255), outline=(220, 220, 220, 255), width=1)
        p_rot = p_img.rotate(-math.degrees(angle) - 90, resample=Image.Resampling.BICUBIC, center=(center, center))
        img = Image.alpha_composite(img, p_rot)
        draw = ImageDraw.Draw(img)
        
    disc_r = 4.5
    draw.ellipse([center - disc_r, center - disc_r, center + disc_r, center + disc_r], fill=(255, 195, 20, 255), outline=(220, 150, 0, 255), width=1)
    return img

print("Generating Daisy badges...")
badge32 = create_badge(32)
watermark512 = create_daisy_flower(512)

badge_paths = [
    "src/client/resources/assets/clientcore/textures/font/river_badge.png",
    "src/client/resources/assets/clientcore/textures/font/river_badge_halloween.png"
]
for bp in badge_paths:
    os.makedirs(os.path.dirname(bp), exist_ok=True)
    badge32.save(bp)
    print("Saved badge to", bp)

wm_paths = [
    "src/client/resources/assets/clientcore/textures/watermark_logo.png",
    "src/client/resources/assets/clientcore/textures/watermark_logo_halloween.png",
    "src/main/resources/assets/clientcore/textures/watermark_logo.png"
]
for wp in wm_paths:
    os.makedirs(os.path.dirname(wp), exist_ok=True)
    watermark512.save(wp)
    print("Saved watermark to", wp)

# Also update the cape texture for river.png to a beautiful Daisy Cape!
cape_img = Image.new("RGBA", (64, 32), (0, 0, 0, 0))
# Daisy yellow & dark slate cape design
cape_draw = ImageDraw.Draw(cape_img)
# Fill cape base with rich deep slate / charcoal (#18181b)
# Cape back face is (1, 1) to (11, 17) -> width 10, height 16
# Cape front face is (12, 1) to (22, 17)
# Let's fill the whole cape bounds
cape_draw.rectangle([0, 0, 63, 31], fill=(24, 24, 27, 255))
# Golden yellow trim on bottom and edges
# Bottom trim
cape_draw.rectangle([0, 15, 22, 16], fill=(255, 199, 44, 255))
cape_draw.rectangle([0, 30, 22, 31], fill=(255, 199, 44, 255))
# Place a miniature daisy flower in the center of the back face (u: 1..11, v: 1..17 -> center around x=6, y=9)
small_daisy = create_badge(10)
cape_img.paste(small_daisy, (1, 4), small_daisy)
# And on the front face (u: 12..22, v: 1..17 -> center around x=17, y=9)
cape_img.paste(small_daisy, (12, 4), small_daisy)

cape_path = "src/client/resources/assets/clientcore/textures/cape/river.png"
if os.path.exists(os.path.dirname(cape_path)):
    cape_img.save(cape_path)
    print("Saved updated daisy cape to", cape_path)

print("Daisy logos and textures successfully created!")

