#!/usr/bin/env python3
"""랜딩을 한 장짜리로 굽는다.

색은 전부 tokens.css 에 있다. index.html 만 떼어 보내면(메신저 첨부, 미리보기 패널)
링크가 안 걸려 흰 배경에 검은 글씨로 떨어진다. 보여주기·공유는 이 파일로 한다.

    python3 landing/build-single.py
"""
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).parent
SRC = HERE / "index.html"
OUT = HERE / "index.single.html"


def inline_css(html: str) -> str:
    def repl(m):
        href = m.group(1)
        path = HERE / href
        if not path.exists():
            return m.group(0)
        return f"<style>\n/* {href} */\n{path.read_text()}\n</style>"
    return re.sub(r'<link rel="stylesheet" href="([^"]+)">', repl, html)


def inline_js(html: str) -> str:
    def repl(m):
        src = m.group(1)
        path = HERE / src
        if not path.exists():
            return m.group(0)
        return f"<script>\n/* {src} */\n{path.read_text()}\n</script>"
    return re.sub(r'<script src="([^"]+)"></script>', repl, html)


def inline_images(html: str) -> str:
    def repl(m):
        before, src, after = m.group(1), m.group(2), m.group(3)
        if src.startswith(("http", "data:")):
            return m.group(0)
        path = (HERE / src).resolve()
        if not path.exists():
            return m.group(0)
        mime = "image/png" if path.suffix == ".png" else "image/jpeg"
        b64 = base64.b64encode(path.read_bytes()).decode()
        return f'<img{before}src="data:{mime};base64,{b64}"{after}>'
    return re.sub(r'<img([^>]*?)src="([^"]+)"([^>]*?)>', repl, html)


def main() -> None:
    html = SRC.read_text()
    html = inline_css(html)
    html = inline_js(html)
    html = inline_images(html)
    # 파비콘 링크는 상위 폴더를 가리키므로 한 장짜리에서는 뺀다
    html = re.sub(r'\s*<link rel="icon"[^>]*>', "", html)
    OUT.write_text(html)
    size = OUT.stat().st_size
    print(f"{OUT.name} — {size / 1024:.0f}KB")
    leftover = re.findall(r'(?:href|src)="(?!https?:|data:|#|\.\./)([^"]+)"', html)
    print("남은 외부 참조:", leftover or "없음")


if __name__ == "__main__":
    main()
