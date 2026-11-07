import os
import math
from PIL import Image, ImageDraw, ImageFont

def create_daisy_menu_title(path):
    W, H = 2048, 551
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    
    font_size = 380
    font = None
    for fpath in ['C:/Windows/Fonts/impact.ttf', 'C:/Windows/Fonts/ariblk.ttf']:
        if os.path.exists(fpath):
            try:
                font = ImageFont.truetype(fpath, font_size)
                break
            except Exception:
                pass
    if not font:
        font = ImageFont.load_default()

    text = "DAISY"
    dummy = Image.new('RGBA', (100, 100), (0, 0, 0, 0))
    d_draw = ImageDraw.Draw(dummy)
    bbox = d_draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]

    tx = (W - tw) // 2 - bbox[0]
    ty = (H - th) // 2 - bbox[1] - 25

    draw = ImageDraw.Draw(img)

    # 1. 3D Extrusion Shadow (black outline + depth)
    depth = 48
    # Black outline along bottom extrusion
    for dy in range(depth, depth - 12, -2):
        for ox in (-12, -6, 0, 6, 12):
            for oy in (-12, -6, 0, 6, 12):
                draw.text((tx + ox, ty + dy + oy), text, font=font, fill=(15, 12, 18, 255))

    # Amber / Gold bevel sides
    for dy in range(depth - 8, 0, -3):
        ratio = dy / float(depth)
        r = int(190 * (1 - ratio * 0.55))
        g = int(130 * (1 - ratio * 0.65))
        b = int(25 * (1 - ratio * 0.75))
        draw.text((tx, ty + dy), text, font=font, fill=(r, g, b, 255))

    # Black border for front face
    for ox in (-10, -5, 0, 5, 10):
        for oy in (-10, -5, 0, 5, 10):
            if ox != 0 or oy != 0:
                draw.text((tx + ox, ty + oy), text, font=font, fill=(10, 8, 12, 255))

    # Front Face Gradient
    text_mask = Image.new('L', (W, H), 0)
    m_draw = ImageDraw.Draw(text_mask)
    m_draw.text((tx, ty), text, font=font, fill=255)

    grad = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(grad)
    for y in range(ty - 5, ty + th + 15):
        prog = max(0.0, min(1.0, (y - ty) / float(th)))
        # Daisy Yellow gradient
        r = 255
        g = int(245 * (1 - prog) + 165 * prog)
        b = int(120 * (1 - prog) + 10 * prog)
        g_draw.line([(0, y), (W, y)], fill=(r, g, b, 255), width=1)

    img.paste(grad, (0, 0), text_mask)

    # Flower icon
    flower = Image.new('RGBA', (180, 180), (0, 0, 0, 0))
    fcx, fcy = 90, 90
    petals = 10
    petal_len = 52
    petal_w = 20

    for i in range(petals):
        angle = (2 * math.pi / petals) * i
        p_img = Image.new('RGBA', (180, 180), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        p_draw.ellipse([fcx + 12, fcy - petal_w//2, fcx + 12 + petal_len, fcy + petal_w//2], fill=(255, 255, 255, 255), outline=(220, 220, 225, 255), width=2)
        p_rot = p_img.rotate(-math.degrees(angle), center=(fcx, fcy))
        flower = Image.alpha_composite(flower, p_rot)

    f_draw = ImageDraw.Draw(flower)
    center_r = 24
    f_draw.ellipse([fcx - center_r - 2, fcy - center_r - 2, fcx + center_r + 2, fcy + center_r + 2], fill=(225, 135, 0, 255))
    f_draw.ellipse([fcx - center_r, fcy - center_r, fcx + center_r, fcy + center_r], fill=(255, 205, 10, 255))
    f_draw.ellipse([fcx - center_r//2, fcy - center_r//2 - 2, fcx + center_r//2, fcy + center_r//2 - 2], fill=(255, 240, 90, 255))

    fl_x = tx + tw - 70
    fl_y = ty - 45
    # Flower border/shadow
    for ox in (-4, 0, 4):
        for oy in (-4, 0, 4):
            img.paste((10, 8, 12, 180), (fl_x + ox, fl_y + oy + 4), flower)
    img.paste(flower, (fl_x, fl_y), flower)

    img.save(path, 'PNG')
    print("Created:", path)

def create_daisy_watermark(path):
    W, H = 500, 500
    flower = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    fcx, fcy = W // 2, H // 2
    petals = 12
    petal_len = 150
    petal_w = 54

    for i in range(petals):
        angle = (2 * math.pi / petals) * i
        p_img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(p_img)
        p_draw.ellipse([fcx + 35, fcy - petal_w//2, fcx + 35 + petal_len, fcy + petal_w//2], fill=(255, 255, 255, 255), outline=(225, 228, 235, 255), width=4)
        p_rot = p_img.rotate(-math.degrees(angle), center=(fcx, fcy))
        flower = Image.alpha_composite(flower, p_rot)

    f_draw = ImageDraw.Draw(flower)
    center_r = 70
    f_draw.ellipse([fcx - center_r - 6, fcy - center_r - 6, fcx + center_r + 6, fcy + center_r + 6], fill=(210, 130, 0, 255))
    f_draw.ellipse([fcx - center_r, fcy - center_r, fcx + center_r, fcy + center_r], fill=(255, 199, 44, 255))
    f_draw.ellipse([fcx - center_r * 0.7, fcy - center_r * 0.8, fcx + center_r * 0.7, fcy + center_r * 0.1], fill=(255, 235, 100, 255))

    flower.save(path, 'PNG')
    print("Created:", path)

if __name__ == '__main__':
    create_daisy_menu_title('src/client/resources/assets/clientcore/textures/menu_title.png')
    create_daisy_watermark('src/client/resources/assets/clientcore/textures/watermark_logo.png')
