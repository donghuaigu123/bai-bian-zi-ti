#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成 App 运行期需要的三类派生资源（构建时执行，产物一并入库便于审阅）：

  1. app/assets/fonts.js        —— 实际打包了哪些字体文件
  2. app/assets/font-coverage.js —— 各字库的 BMP 覆盖位图，供前端逐字判断缺字
  3. app/assets/fonts/preview/*.png —— 字体卡片缩略图

依赖：fonttools、Pillow

用法：
    python3 scripts/gen_assets.py
"""
import base64
import json
import os
import sys

from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "assets")
FONTS_DIR = os.path.join(ASSETS, "fonts")
PREVIEW_DIR = os.path.join(FONTS_DIR, "preview")

# ---------------------------------------------------------------- 字体清单
# id -> (显示名, 字体文件, font-family, 是否风格化)
# 必须与 app/assets/app.js 中的 FONTS 表保持一致。
FONT_TABLE = [
    ("wenkai",     "霞鹜文楷", "LXGWWenKai-Regular.ttf",        "BB-WenKai",  None),
    ("mashan",     "马善政楷", "MaShanZheng.ttf",               "BB-Kai",     None),
    ("longcang",   "龙藏行楷", "LongCang.ttf",                  "BB-XingKai", None),
    ("lishu",      "青柳古隶", "lishu.ttf",                     "BB-Lishu",   None),
    ("zhuan",      "说文小篆", "zhuanshu.ttf",                  "BB-Zhuan",   None),
    ("zhimang",    "志莽行书", "ZhiMangXing.ttf",               "BB-Xing",    None),
    ("liujian",    "刘建毛草", "LiuJianMaoCao.ttf",             "BB-Cao",     None),
    ("xiaowei",    "站酷小薇", "ZCOOLXiaoWei.ttf",              "BB-WeiBei",  None),
    ("song",       "思源宋体", "NotoSerifSC-GB.ttf",            "BB-Song",    None),
    ("huangyou",   "庆科黄油", "heiti.ttf",                     "BB-HuangYou", None),
    ("kuaile",     "站酷快乐", "ZCOOLKuaiLe.ttf",               "BB-KuaiLe",  None),
    ("marker",     "霞鹜漫黑", "LXGWMarkerGothic-Regular.ttf",  "BB-Marker",  None),
    ("hei",        "系统黑体", None,                            "sans-serif", None),
    ("liStyle",    "汉隶风",   "ZCOOLXiaoWei.ttf",              "BB-LiStyle", "li"),
    ("zhuanStyle", "金石风",   "MaShanZheng.ttf",               "BB-ZhuanStyle", "zhuan"),
]

# 系统字体预览用本地 Noto Sans CJK 替身（仅用于生成缩略图）
SYSTEM_PROXY = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
]


def font_path(name):
    return os.path.join(FONTS_DIR, name)


def check_font(path):
    """返回 (cmap 集合, 汉字数)；损坏返回 (None, 0)。"""
    try:
        t = TTFont(path, lazy=True)
        cmap = t.getBestCmap() or {}
        han = sum(1 for cp in cmap if 0x4E00 <= cp <= 0x9FFF)
        t.close()
        return set(cmap.keys()), han
    except Exception as e:
        print("  ✗ 字体损坏：%s (%s)" % (os.path.basename(path), e))
        return None, 0


# ---------------------------------------------------------------- 1. fonts.js
def gen_font_list():
    names = sorted(
        f for f in os.listdir(FONTS_DIR)
        if f.lower().endswith((".ttf", ".otf")) and os.path.isfile(os.path.join(FONTS_DIR, f))
    )
    lines = [
        "/* 由 scripts/gen_assets.py 生成：实际打包进 APK 的字体文件清单。 */",
        "window.FONT_FILES = {",
    ]
    for i, n in enumerate(names):
        lines.append('  "%s": 1%s' % (n, "," if i < len(names) - 1 else ""))
    lines.append("};")
    open(os.path.join(ASSETS, "fonts.js"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("  fonts.js：%d 个字体文件" % len(names))
    return names


# ---------------------------------------------------------------- 2. 覆盖位图
def gen_coverage():
    """每个字库生成一张 BMP 覆盖位图（0x0000-0xFFFF，每 8 个码点 1 字节，共 8KB）。"""
    total = 0x10000 // 8
    out = [
        "/* 由 scripts/gen_assets.py 生成：各字库 BMP 码点覆盖位图（base64）。",
        " * 每 8 个码点占 1 字节，前端可按码点 O(1) 判断字库是否有该字。",
        " * 数据来源：字体 cmap 表，构建时用 fontTools 提取。 */",
        "window.FONT_COVERAGE = {",
    ]
    entries = []
    for fid, name, fname, fam, styl in FONT_TABLE:
        if not fname:
            continue                      # 系统字体不做缺字判断
        path = font_path(fname)
        if not os.path.exists(path):
            print("  ⚠ 跳过缺失字体：%s" % fname)
            continue
        cmap, han = check_font(path)
        if cmap is None:
            continue
        bits = bytearray(total)
        n = 0
        for cp in cmap:
            if cp > 0xFFFF:
                continue
            bits[cp >> 3] |= (1 << (cp & 7))
            n += 1
        b64 = base64.b64encode(bytes(bits)).decode("ascii")
        entries.append((fam, b64))
        print("  %-12s %-9s cmap=%-6d 汉字=%-5d 位图=%dKB" % (fam, name, n, han, len(b64) // 1024))

    for i, (fam, b64) in enumerate(entries):
        out.append('  "%s": "%s"%s' % (fam, b64, "," if i < len(entries) - 1 else ""))
    out.append("};")
    p = os.path.join(ASSETS, "font-coverage.js")
    open(p, "w", encoding="utf-8").write("\n".join(out) + "\n")
    print("  font-coverage.js：%d 款字库，%.1f KB" % (len(entries), os.path.getsize(p) / 1024))


# ---------------------------------------------------------------- 3. 缩略图
def gen_previews():
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    CW, CH = 200, 200
    for fid, name, fname, fam, styl in FONT_TABLE:
        if fname:
            path = font_path(fname)
            if not os.path.exists(path):
                continue
        else:
            path = next((p for p in SYSTEM_PROXY if os.path.exists(p)), None)
            if not path:
                continue

        img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        size = 132
        try:
            f = ImageFont.truetype(path, size, index=0)
        except Exception:
            f = ImageFont.load_default()

        # 风格化：先画在临时图层，再做缩放模拟隶/篆的比例
        tmp = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
        dt = ImageDraw.Draw(tmp)
        dt.text((CW // 2, CH // 2), "永", font=f, fill=(38, 34, 30, 255), anchor="mm")

        if styl == "li":
            tmp = tmp.resize((int(CW * 1.12), int(CH * 0.82)), Image.LANCZOS)
            img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
            img.paste(tmp, ((CW - tmp.width) // 2, (CH - tmp.height) // 2), tmp)
        elif styl == "zhuan":
            tmp = tmp.resize((int(CW * 0.88), int(CH * 1.14)), Image.LANCZOS)
            img = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
            img.paste(tmp, ((CW - tmp.width) // 2, (CH - tmp.height) // 2), tmp)
        else:
            img = tmp

        img.save(os.path.join(PREVIEW_DIR, fid + ".png"), "PNG", optimize=True)
    print("  preview/*.png：%d 张" % len([f for f in os.listdir(PREVIEW_DIR) if f.endswith(".png")]))


def main():
    print("=== 1. 字体清单 ===")
    gen_font_list()
    print("=== 2. 缺字覆盖位图 ===")
    gen_coverage()
    print("=== 3. 字体缩略图 ===")
    gen_previews()
    print("完成。")


if __name__ == "__main__":
    main()
