# 生成 PWA 图标（纯标准库，无第三方依赖）
# 用法：python tools/generate_icons.py   → 输出到 docs/ 目录
# 图形：圆角蓝色方块（--accent）+ 白色上升折线
import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs')

BG = (47, 111, 237)   # 与 style.css 的 --accent 一致
FG = (255, 255, 255)

# 折线顶点（占边长比例），从左下到右上
ZIG = [(0.26, 0.64), (0.44, 0.46), (0.60, 0.56), (0.78, 0.34)]
THICK = 0.055  # 线宽（占边长比例）


def in_rounded_rect(x, y, s, m, r):
    """点 (x, y) 是否在圆角矩形（边距 m、圆角半径 r）内"""
    lo, hi = m, s - m
    if x < lo or x > hi or y < lo or y > hi:
        return False
    # 四角圆弧
    if x < lo + r and y < lo + r and (x - (lo + r)) ** 2 + (y - (lo + r)) ** 2 > r * r:
        return False
    if x > hi - r and y < lo + r and (x - (hi - r)) ** 2 + (y - (lo + r)) ** 2 > r * r:
        return False
    if x < lo + r and y > hi - r and (x - (lo + r)) ** 2 + (y - (hi - r)) ** 2 > r * r:
        return False
    if x > hi - r and y > hi - r and (x - (hi - r)) ** 2 + (y - (hi - r)) ** 2 > r * r:
        return False
    return True


def dist_to_segment(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    seg2 = vx * vx + vy * vy
    t = 0.0 if seg2 == 0 else max(0.0, min(1.0, ((px - ax) * vx + (py - ay) * vy) / seg2))
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def sample(x, y, s, m, r):
    """返回 (r, g, b, a)。x、y 为像素内采样点坐标"""
    if not in_rounded_rect(x, y, s, m, r):
        return (0, 0, 0, 0)
    hit = min(
        dist_to_segment(x, y, ax * s, ay * s, bx * s, by * s)
        for (ax, ay), (bx, by) in zip(ZIG, ZIG[1:])
    ) <= THICK * s
    return (FG + (255,)) if hit else (BG + (255,))


def render(size, margin_ratio, radius_ratio, aa=3):
    s = float(size)
    m = s * margin_ratio
    r = s * radius_ratio
    rows = []
    for py in range(size):
        row = bytearray([0])  # filter: None
        for px in range(size):
            acc = [0, 0, 0, 0]
            for sy in range(aa):
                for sx in range(aa):
                    c = sample(px + (sx + 0.5) / aa, py + (sy + 0.5) / aa, s, m, r)
                    for i in range(4):
                        acc[i] += c[i]
            n = aa * aa
            row += bytes(v // n for v in acc)
        rows.append(bytes(row))
    return b''.join(rows)


def chunk(tag, data):
    return (
        struct.pack('>I', len(data))
        + tag
        + data
        + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path, size, margin_ratio, radius_ratio):
    raw = render(size, margin_ratio, radius_ratio)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 6, 0, 0, 0)
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)
    print('wrote', path)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    write_png(os.path.join(OUT_DIR, 'icon-192.png'), 192, 0.06, 0.22)
    write_png(os.path.join(OUT_DIR, 'icon-512.png'), 512, 0.06, 0.22)
    # maskable：内容缩进到中央 80% 安全区，避免被系统裁成圆形/异形时切掉
    write_png(os.path.join(OUT_DIR, 'icon-maskable-512.png'), 512, 0.20, 0.10)


if __name__ == '__main__':
    main()
