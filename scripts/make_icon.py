#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百变字体 · 图标生成
意象：一张宣纸练习纸 —— 朱丝田字格，格中一个行书「字」。
输出：
  app/res/mipmap-*/ic_launcher.png        传统图标（自带圆角）
  app/res/mipmap-*/ic_launcher_fg.png     自适应图标前景（透明底）
  app/res/mipmap-*/ic_launcher_bg.png     自适应图标背景（纸纹）
运行： python3 scripts/make_icon.py
"""
import os, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "app", "res")
FONT_PATH = os.path.join(ROOT, "app", "assets", "fonts", "ZhiMangXing.ttf")  # 志莽行书

S = 1024
PAPER = (243, 234, 216)
INK = (36, 31, 25)
GRID = (178, 86, 71)          # 朱丝格


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
    img = Image.composite(Image.new("RGB", (size, size), (205, 187, 156)),
                          img, vig.point(lambda v: int(v * 0.24)))
    return img


def dashed(d, p0, p1, fill, width, dash, gap):
    """虚线段（PIL 无原生虚线）"""
    x0, y0 = p0
    x1, y1 = p1
    L = math.hypot(x1 - x0, y1 - y0)
    if L <= 0:
        return
    ux, uy = (x1 - x0) / L, (y1 - y0) / L
    t = 0.0
    while t < L:
        e = min(t + dash, L)
        d.line([(x0 + ux * t, y0 + uy * t), (x0 + ux * e, y0 + uy * e)],
               fill=fill, width=int(width))
        t = e + gap


def grid_layer(size, ratio=0.72, alpha_outer=182, alpha_inner=116):
    """朱丝田字格：外框实线 + 中心十字虚线"""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    g = size * ratio
    x0 = y0 = (size - g) / 2
    x1 = y1 = x0 + g
    lw = max(2, int(round(size * 0.0175)))
    d.rectangle([x0, y0, x1, y1], outline=GRID + (alpha_outer,), width=lw)
    lw2 = max(2, int(round(size * 0.0135)))
    dash = size * 0.048
    gap = size * 0.035
    cx, cy = size / 2, size / 2
    dashed(d, (cx, y0 + lw / 2), (cx, y1 - lw / 2), GRID + (alpha_inner,), lw2, dash, gap)
    dashed(d, (x0 + lw / 2, cy), (x1 - lw / 2, cy), GRID + (alpha_inner,), lw2, dash, gap)
    return layer


def glyph_mask(ch, px, font_path=FONT_PATH):
    f = ImageFont.truetype(font_path, px)
    box = f.getbbox(ch)
    w, h = box[2] - box[0], box[3] - box[1]
    canvas = Image.new("L", (w + px, h + px), 0)
    ImageDraw.Draw(canvas).text((px // 2 - box[0], px // 2 - box[1]), ch, font=f, fill=255)
    return canvas.crop(canvas.getbbox())


def build_icon(size=S, with_paper=True, grid_ratio=0.72, ch="字",
               font_path=FONT_PATH, glyph_ratio=0.66):
    _seed()
    img = (paper_base(size).convert("RGBA") if with_paper
           else Image.new("RGBA", (size, size), (0, 0, 0, 0)))

    if grid_ratio > 0:
        img = Image.alpha_composite(img, grid_layer(size, grid_ratio))

    # 行书墨字：按字形包围盒居中于格心
    cell = size * (grid_ratio if grid_ratio > 0 else 0.9)
    target = cell * glyph_ratio
    g = glyph_mask(ch, int(size * 0.9), font_path)
    scale = min(target / g.width, target / g.height)
    g = g.resize((max(1, int(g.width * scale)), max(1, int(g.height * scale))), Image.LANCZOS)

    pos = ((size - g.width) // 2, (size - g.height) // 2)
    # 墨落纸上的一点晕染
    blur = g.filter(ImageFilter.GaussianBlur(max(1.0, size * 0.0022))).point(lambda v: int(v * 0.5))
    img.paste(Image.new("RGBA", g.size, INK + (255,)), pos, blur)
    img.paste(Image.new("RGBA", g.size, INK + (255,)), pos, g)
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
    master = round_mask(build_icon(S, True), 0.17)
    for d, px in DENS.items():
        folder = os.path.join(RES, "mipmap-" + d)
        os.makedirs(folder, exist_ok=True)
        master.resize((px, px), Image.LANCZOS).save(os.path.join(folder, "ic_launcher.png"), optimize=True)

    # 自适应：前景放田字格 + 字（整体收进安全区），背景铺纸纹
    fg = build_icon(S, False, grid_ratio=0.60, glyph_ratio=0.64)
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
