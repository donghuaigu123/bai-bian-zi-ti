#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百变字体 · 图标生成
意象：宣纸一方，朱砂一印，印中一「变」。
输出：
  app/res/mipmap-*/ic_launcher.png        传统图标（自带圆角）
  app/res/mipmap-*/ic_launcher_fg.png     自适应图标前景（透明底）
运行： python3 scripts/make_icon.py
"""
import os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "app", "res")
FONT_PATH = os.path.join(ROOT, "app", "assets", "fonts", "MaShanZheng.ttf")

S = 1024
PAPER = (243, 234, 216)
CINNABAR = (168, 52, 42)
CINNABAR_D = (134, 34, 27)
GOLD = (172, 142, 84)


def _seed():
    random.seed(20261118)
    np.random.seed(20261118)


def paper_base(size=S):
    """宣纸底：暖白 + 细纤维 + 中心受光 + 四周微暗"""
    _seed()
    img = Image.new("RGB", (size, size), PAPER)
    n = np.random.normal(0, 1, (size, size))
    n = ((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8)
    n = np.array(Image.fromarray(n).filter(ImageFilter.GaussianBlur(0.7)))
    arr = np.array(img).astype(np.int16)
    arr = arr + ((n.astype(np.int16) - 128) * 0.11).astype(np.int16)[..., None]
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    light = Image.new("L", (size, size), 0)
    ImageDraw.Draw(light).ellipse([-size * .22, -size * .40, size * 1.22, size * .92], fill=40)
    light = light.filter(ImageFilter.GaussianBlur(size * .11))
    img = Image.composite(Image.new("RGB", (size, size), (255, 251, 241)),
                          img, light.point(lambda v: int(v * 0.5)))

    vig = Image.new("L", (size, size), 0)
    ImageDraw.Draw(vig).rounded_rectangle([0, 0, size - 1, size - 1],
                                          radius=int(size * .17), outline=255, width=int(size * .09))
    vig = vig.filter(ImageFilter.GaussianBlur(size * .06))
    img = Image.composite(Image.new("RGB", (size, size), (203, 184, 152)),
                          img, vig.point(lambda v: int(v * 0.26)))
    return img


def glyph_mask(ch, px, font_path=FONT_PATH):
    f = ImageFont.truetype(font_path, px)
    box = f.getbbox(ch)
    w, h = box[2] - box[0], box[3] - box[1]
    canvas = Image.new("L", (w + px, h + px), 0)
    ImageDraw.Draw(canvas).text((px // 2 - box[0], px // 2 - box[1]), ch, font=f, fill=255)
    return canvas.crop(canvas.getbbox())


def seal_face(side):
    """印面：朱砂底 + 印泥浓淡 + 石章磕碰 + 露白针孔"""
    _seed()
    img = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(side * 0.045)
    d.rounded_rectangle([0, 0, side - 1, side - 1], radius=r, fill=CINNABAR + (255,))

    arr = np.array(img).astype(np.float32)

    # —— 印泥浓淡：低频斑块 + 中心略实、边缘略虚
    low = np.random.normal(0, 1, (side // 20 + 2, side // 20 + 2))
    low = ((low - low.min()) / (low.max() - low.min()) * 255).astype(np.uint8)
    low = np.array(Image.fromarray(low).resize((side, side), Image.BICUBIC)
                   .filter(ImageFilter.GaussianBlur(side * .015))).astype(np.float32) / 255.0
    yy, xx = np.mgrid[0:side, 0:side] / side
    radial = 1.0 - 0.22 * np.clip(((xx - .5) ** 2 + (yy - .5) ** 2) * 3.6, 0, 1)
    dens = np.clip(0.72 + 0.30 * low, 0, 1) * radial
    arr[..., 3] *= np.clip(dens * 1.15, 0, 1)

    # 颜色随浓度向深朱偏移
    for i, c in enumerate(CINNABAR_D):
        arr[..., i] = np.clip(arr[..., i] * 0.86 + c * 0.14, 0, 255)

    img = Image.fromarray(arr.astype(np.uint8))

    # —— 石章磕碰：沿四边少量、大小不一的缺口（不是均匀虚线）
    er = Image.new("L", (side, side), 255)
    de = ImageDraw.Draw(er)
    def bite(n, horiz, edge_val):
        for _ in range(n):
            t = random.uniform(0.02, 0.98)
            pos = t * side
            depth = random.uniform(0.004, 0.030) * side
            wid = random.uniform(0.006, 0.042) * side
            alpha = random.randint(40, 190)
            if horiz:
                cx, cy = pos, edge_val
                de.ellipse([cx - wid, cy - depth, cx + wid, cy + depth], fill=alpha)
            else:
                cx, cy = edge_val, pos
                de.ellipse([cx - depth, cy - wid, cx + depth, cy + wid], fill=alpha)
    bite(9, True, 0); bite(9, True, side - 1)
    bite(9, False, 0); bite(9, False, side - 1)
    er = er.filter(ImageFilter.GaussianBlur(side * 0.0022))

    arr = np.array(img).astype(np.float32)
    arr[..., 3] *= (np.array(er).astype(np.float32) / 255.0)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    # —— 露白针孔：印泥没吃透的小点
    holes = Image.new("L", (side, side), 0)
    dh = ImageDraw.Draw(holes)
    for _ in range(int(side * 0.55)):
        x, y = random.uniform(0, side), random.uniform(0, side)
        rr = random.uniform(0.0012, 0.004) * side
        dh.ellipse([x - rr, y - rr, x + rr, y + rr], fill=random.randint(30, 110))
    holes = holes.filter(ImageFilter.GaussianBlur(side * 0.0012))
    arr = np.array(img).astype(np.float32)
    arr[..., 3] *= (1 - (np.array(holes).astype(np.float32) / 255.0) * 0.85)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def seal_unit(side, ch="变", font_path=FONT_PATH):
    """完整钤印单元：油渍 + 印面 + 阴文，整体轻微倾斜，像手工按下的一印"""
    pad = int(side * 0.10)
    unit = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))

    halo = Image.new("RGBA", unit.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).rounded_rectangle(
        [pad - side * .035, pad - side * .035, pad + side * 1.035, pad + side * 1.035],
        radius=int(side * .09), fill=CINNABAR + (24,))
    unit = Image.alpha_composite(unit, halo.filter(ImageFilter.GaussianBlur(side * .035)))

    face = seal_face(side)
    unit.alpha_composite(face, (pad, pad))

    # 印文（阴文）
    g = glyph_mask(ch, int(side * 0.8), font_path)
    scale = min(side * 0.66 / g.width, side * 0.66 / g.height)
    g = g.resize((max(1, int(g.width * scale)), max(1, int(g.height * scale))), Image.LANCZOS)
    g = g.filter(ImageFilter.MaxFilter(3))
    ga = np.array(g).astype(np.float32) / 255.0
    noise = np.random.normal(0, 1, ga.shape)
    noise = ((noise - noise.min()) / (noise.max() - noise.min()) * 255).astype(np.uint8)
    noise = np.array(Image.fromarray(noise).filter(ImageFilter.GaussianBlur(1.4))).astype(np.float32) / 255.0
    ga = np.clip(ga * (0.80 + 0.32 * noise), 0, 1)
    g = Image.fromarray((ga * 255).astype(np.uint8))

    gx = pad + (side - g.width) // 2
    gy = pad + (side - g.height) // 2
    unit.paste(Image.new("RGBA", g.size, PAPER + (255,)), (gx, gy), g)

    return unit.rotate(-1.4, resample=Image.BICUBIC, expand=False)


def build_icon(size=S, with_paper=True, seal_ratio=0.68, ch="变", font_path=FONT_PATH):
    _seed()
    if with_paper:
        img = paper_base(size).convert("RGBA")
    else:
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    side = int(size * seal_ratio)
    unit = seal_unit(side, ch, font_path)
    px, py = (size - unit.width) // 2, (size - unit.height) // 2

    # 极淡投影：印章压在纸上的一点厚度
    if with_paper:
        sh = Image.new("RGBA", unit.size, (0, 0, 0, 0))
        sh.paste((90, 60, 40, 30), (0, 0), unit.split()[3])
        sh = sh.filter(ImageFilter.GaussianBlur(size * 0.012))
        img.alpha_composite(sh, (px, py + int(size * 0.008)))

    img.alpha_composite(unit, (px, py))
    return img


def round_mask(img, radius_ratio=0.17):
    m = Image.new("L", img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1],
                                        radius=int(img.size[0] * radius_ratio), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


DENS = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
DENS_FG = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def main():
    master = round_mask(build_icon(S, True, 0.68), 0.17)
    for d, px in DENS.items():
        folder = os.path.join(RES, "mipmap-" + d)
        os.makedirs(folder, exist_ok=True)
        master.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher.png"), optimize=True)

    fg = build_icon(S, False, 0.50)
    bg = paper_base(S)
    for d, px in DENS_FG.items():
        folder = os.path.join(RES, "mipmap-" + d)
        fg.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher_fg.png"), optimize=True)
        bg.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher_bg.png"), optimize=True)

    anydpi = os.path.join(RES, "mipmap-anydpi-v26")
    os.makedirs(anydpi, exist_ok=True)
    xml = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_bg" />
    <foreground android:drawable="@mipmap/ic_launcher_fg" />
</adaptive-icon>
"""
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        with open(os.path.join(anydpi, name), "w", encoding="utf-8") as f:
            f.write(xml)

    preview_dir = os.path.join(ROOT, "docs")
    os.makedirs(preview_dir, exist_ok=True)
    master.resize((512, 512), Image.LANCZOS).save(os.path.join(preview_dir, "icon-512.png"), optimize=True)
    print("图标已生成：5 档密度 + 自适应图标（前景/背景）+ docs/icon-512.png")


if __name__ == "__main__":
    main()
