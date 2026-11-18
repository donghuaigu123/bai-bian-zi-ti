# 百变字体 · 字体来源与授权

本 App 内置的每一款字体均可自由再分发。授权原文随 APK 一并打包在
`app/assets/fonts/licenses/` 目录，可自行解包查阅。

> 字体**不适用本项目的 MIT 许可**，各自遵循其原始授权。再分发、修改或商业使用时请以对应授权文本为准。

## 一、内置字库一览

| # | 名称 | 书体 | 文件 | 字符覆盖 | 授权 |
|---|------|------|------|----------|------|
| 1 | 霞鹜文楷 | 楷书 | `LXGWWenKai-Regular.ttf` | 43493 字符 / 20992 汉字 | SIL OFL 1.1 |
| 2 | 马善政毛笔楷书 | 楷书 | `MaShanZheng.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 3 | 龙藏体 | 行楷 | `LongCang.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 4 | 青柳古隶 | 隶书 | `lishu.ttf` | 12204 汉字 | 作者自由授权（须附条款与解说） |
| 5 | 说文小篆 | 篆书 | `zhuanshu.ttf` | 4752 汉字 | 来源具名声明（全字库） |
| 6 | 志莽行书 | 行书 | `ZhiMangXing.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 7 | 刘建毛草 | 草书 | `LiuJianMaoCao.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 8 | 站酷小薇体 | 魏碑 | `ZCOOLXiaoWei.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 9 | 思源宋体（子集） | 宋体 | `NotoSerifSC-GB.ttf` | 6763 汉字 | SIL OFL 1.1 |
| 10 | 站酷庆科黄油体 | 圆黑 | `heiti.ttf` | 7066 汉字 | SIL OFL 1.1 |
| 11 | 站酷快乐体 | 创意手写 | `ZCOOLKuaiLe.ttf` | 6766 汉字 | SIL OFL 1.1 |
| 12 | 霞鹜漫黑 | 马克笔 | `LXGWMarkerGothic-Regular.ttf` | 12771 汉字 | SIL OFL 1.1 |

另外：

- **系统黑体**：直接调用 Android 自带字体，不随包分发，无授权问题。
- **汉隶风 / 金石风**：对站酷小薇、马善政楷做横向扁展 / 竖向修长的**版式变形**，
  不引入新字库，因此没有独立授权问题。

## 二、逐款说明

### 1. 霞鹜文楷 LXGW WenKai

- 作者：LXGW（落霞孤鹜）
- 上游：<https://github.com/lxgw/LxgwWenKai>
- 授权：SIL Open Font License 1.1
- 说明：基于 Fontworks Klee One 衍生的开源中文字体，收录 2 万余汉字，是 App 中
  唯一能整篇覆盖长文的楷书，适合正文与古文。
- 许可全文：`licenses/LXGWWenKai.OFL.txt`

### 2–3、6–8、10–11. Google Fonts 系列

| 字体 | 上游 | 授权 |
|------|------|------|
| Ma Shan Zheng | <https://github.com/googlefonts/mashanzheng> | OFL 1.1 |
| Long Cang | <https://github.com/googlefonts/longcang> | OFL 1.1 |
| Zhi Mang Xing | <https://github.com/googlefonts/zhimangxing> | OFL 1.1 |
| Liu Jian Mao Cao | <https://github.com/googlefonts/liujianmaocao> | OFL 1.1 |
| ZCOOL XiaoWei | <https://github.com/googlefonts/zcoolxiaowei> | OFL 1.1 |
| ZCOOL KuaiLe | <https://github.com/googlefonts/zcoolkuaile> | OFL 1.1 |
| ZCOOL QingKe HuangYou | <https://github.com/googlefonts/zcoolqingkehuangyou> | OFL 1.1 |

许可全文见 `licenses/*.OFL.txt`，逐款保留原始版权行。

### 4. 青柳古隶（Aoyagi Reisho）

- 作者：青柳衡山
- 授权：作者自行发布的自由使用条款，允许免费使用与再分发，但**必须随附条款原文与解说文档**。
- 随包文件：
  - `licenses/bai-bian-yin-zhang/AoyagiReisho_terms_ja.txt`（使用条款原文）
  - `licenses/bai-bian-yin-zhang/AoyagiReisho_explanation.pdf`（解说）
  - `licenses/bai-bian-yin-zhang/AoyagiReisho_explanation.doc`（解说，Word 版）
- 注意：该字库为**日文字集**，简体中文约三成常用字不在字库内，App 会自动用楷书补齐。

### 5. 说文小篆

- 来源：以《说文解字》字形为基础整理的开源小篆字库。
- 具名声明原文：`licenses/bai-bian-yin-zhang/NOTICE-seal-fonts.md`
- 注意：仅 4752 个篆形，覆盖不了现代汉语常用字全集，简体长文会有较多楷书回退。

### 9. 思源宋体子集

- 上游：Source Han Serif / Noto Serif CJK SC（Adobe & Google）
- 授权：SIL OFL 1.1
- 本仓库的 `NotoSerifSC-GB.ttf` 是从官方 TTC 中提取 SC 字形、再子集化到
  GB2312 全集（6763 汉字 + 标点 + 拉丁）的派生版本，体积由 23 MB 降至 4 MB。
- OFL 允许修改与再分发，但**修改版不得使用原字体名称**，故文件已更名，
  App 内显示为「思源宋体」。

## 三、关于「名家字体」的如实说明

界面上标有「名家」的字体，指的是**该字库本身的风格取向**：

| 显示名 | 风格标注 | 实际来源 |
|--------|----------|----------|
| 马善政楷 | 颜真卿风 | 马善政本人的毛笔楷书字库，非颜真卿集字 |
| 志莽行书 | 兰亭序风 | 志莽手写行书，非王羲之集字 |
| 刘建毛草 | 怀素自叙风 | 刘建手写草书，非怀素集字 |
| 青柳古隶 | 曹全碑风 | 青柳衡山古隶，非汉碑拓本 |
| 说文小篆 | 李斯小篆风 | 说文解字字形整理，非秦刻石 |
| 站酷小薇 | 张猛龙碑风 | 现代设计字库，非北魏原碑 |

**颜真卿、柳公权、王羲之、怀素等名家的真迹集字字库均为商业授权**，无法合法打包进开源项目。
App 提供「＋ 我的字体」入口：你购买或获得授权的 TTF/OTF 可直接导入，仅在本机生效。

## 四、缺字回退机制

书法字库普遍收字不全。为避免整篇文章出现方框（豆腐块）：

1. 构建时由 `scripts/gen_assets.py` 读取每个字库的 `cmap` 表，生成 BMP 码点覆盖位图
   （`app/assets/font-coverage.js`，每款约 11 KB base64）。
2. 运行时对每个字符做 O(1) 查询；字库没有该字时，**只有这一个字**改用楷书绘制，
   其余文字保持原字体，整篇风格仍然统一。
3. 标题、正文、落款、印章四处采用同一套判断，不会出现「正文统一、标题崩掉」。
4. 结果页显示「N 字以楷书补齐」，补了几个字一目了然。
