#!/usr/bin/env python3
"""Render original, deterministic Daisy artwork from geometric primitives.

Requires requirements-art.txt. No screenshots, proprietary fonts or downloaded art.
The output paths and dimensions are intentional runtime resources, not build debris.
"""
import json
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]


def flower(draw, x, y, radius, color=(255, 204, 56, 255)):
    for petal in range(10):
        angle = petal * math.tau / 10
        points = []
        for step in range(32):
            t = step * math.tau / 32
            along = radius * (.53 + .46 * math.cos(t))
            across = radius * .18 * math.sin(t)
            points.append((x + along * math.cos(angle) - across * math.sin(angle),
                           y + along * math.sin(angle) + across * math.cos(angle)))
        draw.polygon(points, fill=(246, 248, 238, 255))
    r = radius * .28
    draw.ellipse((x-r, y-r, x+r, y+r), fill=color)


def artwork(spec):
    w, h = spec["width"], spec["height"]
    kind, seed = spec["kind"], spec["variant"]
    rng = random.Random(seed)
    image = Image.new("RGBA", (w, h))
    d = ImageDraw.Draw(image)
    if kind == "landscape":
        # Original abstract night landscape; deliberately contains no game textures.
        for y in range(h):
            f = y / max(1, h-1)
            d.line((0, y, w, y), fill=(int(15+20*f), int(24+28*f), int(39+30*f), 255))
        for _ in range(70):
            x, y = rng.randrange(w), rng.randrange(max(1, h//2))
            d.ellipse((x, y, x+1, y+1), fill=(188, 199, 192, 180))
        for layer in range(4):
            points = [(0, h)] + [(i*w/12, h*(.40+layer*.13)+rng.uniform(-.12,.12)*h) for i in range(13)] + [(w,h)]
            d.polygon(points, fill=(20-layer*3, 42-layer*5, 48-layer*4, 255))
        flower(d, w*.76, h*.25, min(w,h)*.09)
    elif kind == "title":
        font = ImageFont.truetype(str(ROOT / "src/client/resources/assets/clientcore/font/exo-2-700-latin.ttf"), max(8, int(h*.65)))
        box = d.textbbox((0,0), "DAISY", font=font)
        x, y = (w-(box[2]-box[0]))/2, (h-(box[3]-box[1]))/2-box[1]
        d.text((x+3,y+6), "DAISY", font=font, fill=(15,20,28,255), stroke_width=3)
        d.text((x,y), "DAISY", font=font, fill=(255,210,63,255))
        flower(d, min(w-h*.2, x+(box[2]-box[0])+h*.12), h*.45, h*.19)
    elif kind == "cape":
        # Preserve the conventional cape UV canvas while replacing unverified designs.
        d.rectangle((0,0,w,h), fill=(16+seed%20,25,39,255))
        for y in range(0,h,max(1,h//12)):
            d.line((0,y,w,y), fill=(50,72,73,255), width=max(1,h//64))
        flower(d,w*.24,h*.39,min(w*.12,h*.23), (255,170+seed%70,40,255))
    elif kind in {"moon_glow", "mist"}:
        if kind == "moon_glow":
            for radius in range(max(1,min(w,h)//2),0,-1):
                alpha = int(60*(1-radius/(min(w,h)/2))**2)
                d.ellipse((w/2-radius,h/2-radius,w/2+radius,h/2+radius),fill=(246,226,164,alpha))
        else:
            for _ in range(22):
                x,y=rng.randrange(w),rng.randrange(h)
                d.ellipse((x-w*.15,y-h*.12,x+w*.15,y+h*.12),fill=(168,184,197,35))
            image=image.filter(ImageFilter.GaussianBlur(max(1,h/12)))
    elif kind == "bat":
        for frame in range(8):
            x=(frame+.5)*w/8; y=h*.55; unit=w/8
            rise=math.sin(frame*math.tau/8)*h*.25
            d.polygon([(x,y+h*.15),(x-unit*.43,y-rise),(x-unit*.25,y+h*.18),(x,y),(x+unit*.25,y+h*.18),(x+unit*.43,y-rise)],fill=(18,21,29,255))
            d.ellipse((x-unit*.07,y-h*.12,x+unit*.07,y+h*.22),fill=(18,21,29,255))
    elif kind.startswith("web_"):
        x=0 if kind.endswith("left") else w
        for n in range(1,8):
            r=n*max(w,h)/7
            d.arc((x-r,-r,x+r,r),0,180,fill=(175,185,191,110),width=1)
        for n in range(1,8):
            a=n*math.pi/16
            d.line((x,0,x+(-1 if x else 1)*w*math.cos(a),h*math.sin(a)),fill=(175,185,191,110))
    elif kind.startswith("pumpkin"):
        if kind != "pumpkin_light":
            d.ellipse((w*.12,h*.2,w*.88,h*.92),fill=(226,127,36,255))
            d.rectangle((w*.44,h*.1,w*.55,h*.28),fill=(88,117,70,255))
        for x in [.30,.65]:
            d.polygon([(w*x,h*.45),(w*(x+.12),h*.58),(w*(x-.08),h*.58)],fill=(255,225,106,255))
        d.polygon([(w*.27,h*.7),(w*.75,h*.7),(w*.61,h*.81),(w*.39,h*.81)],fill=(255,225,106,255))
    elif kind == "spider":
        for i in range(4):
            y=h*(.3+i*.12)
            d.line((w*.5,h*.55,w*.15,y,w*.05,y+h*.15),fill=(25,29,39,255),width=max(1,w//30))
            d.line((w*.5,h*.55,w*.85,y,w*.95,y+h*.15),fill=(25,29,39,255),width=max(1,w//30))
        d.ellipse((w*.35,h*.3,w*.65,h*.75),fill=(25,29,39,255))
    elif kind == "moon":
        d.ellipse((w*.08,h*.08,w*.92,h*.92),fill=(230,225,184,255))
        d.ellipse((w*.3,h*.2,w*.5,h*.4),fill=(207,204,166,255))
    elif kind == "cube":
        d.polygon([(w/2,h*.1),(w*.9,h*.3),(w/2,h*.5),(w*.1,h*.3)],fill=(132,172,111,255))
        d.polygon([(w*.1,h*.3),(w/2,h*.5),(w/2,h*.9),(w*.1,h*.7)],fill=(53,96,77,255))
        d.polygon([(w/2,h*.5),(w*.9,h*.3),(w*.9,h*.7),(w/2,h*.9)],fill=(34,64,64,255))
    elif kind in {"music", "chat", "cross"}:
        width=max(1,min(w,h)//12)
        if kind=="music":
            d.line((w*.4,h*.7,w*.4,h*.25,w*.75,h*.2,w*.75,h*.6),fill="white",width=width)
            for x,y in [(.3,.72),(.65,.62)]:d.ellipse((w*x,h*y,w*(x+.2),h*(y+.18)),fill="white")
        elif kind=="chat":
            d.rounded_rectangle((w*.12,h*.16,w*.88,h*.75),radius=max(1,w//8),outline="white",width=width)
            d.polygon([(w*.3,h*.7),(w*.3,h*.9),(w*.5,h*.7)],fill="white")
        else:
            d.line((w*.2,h*.2,w*.8,h*.8),fill=(240,102,113,255),width=width)
            d.line((w*.8,h*.2,w*.2,h*.8),fill=(240,102,113,255),width=width)
    elif kind == "white":
        d.rectangle((0,0,w,h),fill="white")
    elif kind == "toggle":
        d.rounded_rectangle((0,0,w-1,h-1),radius=min(w,h)//2,fill=(223,228,238,255))
    elif kind == "noise":
        for _ in range(w*h//5):
            x,y=rng.randrange(w),rng.randrange(h);d.point((x,y),fill=(255,255,255,12))
    else:
        flower(d,w/2,h/2,min(w,h)*.45)
    return image


def main():
    for spec in json.loads((ROOT / "assets/artwork.json").read_text()):
        target=ROOT/spec["path"]
        image=artwork(spec)
        if target.suffix.lower()==".jpg":image=image.convert("RGB")
        image.save(target, **({"quality":92} if target.suffix.lower()==".jpg" else {}))
    print("Rendered original Daisy artwork from assets/artwork.json")


if __name__ == "__main__":
    main()
