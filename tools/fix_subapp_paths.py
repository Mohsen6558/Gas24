#!/usr/bin/env python3
"""Make sub-app pages under src/ independent of where they are mounted.

Each sub-app (src/ardabil, src/mehdi/v24, ...) was built with Vite's default
base "/", so its index.html points at /assets/... on the site root, where those
files do not exist. This rewrites root-absolute references to relative ones when
the target lives inside the app's own folder (or a parent folder of it), so the
page works both at https://gas24.ir/ardabil/ and when the folder is a vhost root.
Safe to re-run.
"""
import json
import os
import re
import sys

SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
SRC = os.path.normpath(SRC)
# Pages served from the site root keep root-absolute paths.
SKIP = {'index.html', os.path.join('app', 'index.html')}
SKIP_DIRS = ('my',)
REF = re.compile(r'''((?:src|href)=["'])(/[^"'#?]+)(["'])''')
CSS_URL = re.compile(r'''url\((["']?)/assets/([^)"']+)\1\)''')


def resolve_local(app_dir, target):
    """Relative path from app_dir to target, searching app_dir and its parents inside src/."""
    rel_target = target.lstrip('/')
    if os.path.exists(os.path.join(SRC, rel_target)):
        return None  # exists at site root: leave it
    probe = app_dir
    while os.path.commonpath([probe, SRC]) == SRC and probe != SRC:
        candidate = os.path.join(probe, rel_target)
        if os.path.exists(candidate):
            rel = os.path.relpath(candidate, app_dir).replace(os.sep, '/')
            return rel if rel.startswith('../') else './' + rel
        probe = os.path.dirname(probe)
    return None


def fix_html(path, changes):
    app_dir = os.path.dirname(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    def repl(m):
        new = resolve_local(app_dir, m.group(2))
        if new is None:
            return m.group(0)
        changes.append(f'{os.path.relpath(path, SRC)}: {m.group(2)} -> {new}')
        return m.group(1) + new + m.group(3)

    fixed = REF.sub(repl, html)
    if fixed != html:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)


def fix_css(path, changes):
    with open(path, encoding='utf-8') as f:
        css = f.read()
    css_dir = os.path.dirname(path)

    def repl(m):
        if not os.path.exists(os.path.join(css_dir, m.group(2))):
            return m.group(0)
        changes.append(f'{os.path.relpath(path, SRC)}: url(/assets/{m.group(2)}) -> ./')
        return f'url({m.group(1)}./{m.group(2)}{m.group(1)})'

    fixed = CSS_URL.sub(repl, css)
    if fixed != css:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(fixed)


def fix_manifest(path, changes):
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    before = json.dumps(data, ensure_ascii=False)
    app_dir = os.path.dirname(path)
    for key in ('id', 'start_url', 'scope'):
        if data.get(key) == '/':
            data[key] = './'
    for icon in data.get('icons', []):
        new = resolve_local(app_dir, icon.get('src', ''))
        if new:
            icon['src'] = new
    if json.dumps(data, ensure_ascii=False) != before:
        changes.append(f'{os.path.relpath(path, SRC)}: root-relative URLs -> ./')
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write('\n')


def main():
    changes = []
    for root, dirs, files in os.walk(SRC):
        rel_root = os.path.relpath(root, SRC)
        if rel_root.split(os.sep)[0] in SKIP_DIRS:
            continue
        for name in files:
            path = os.path.join(root, name)
            rel = os.path.relpath(path, SRC)
            if name == 'index.html' and rel not in SKIP:
                fix_html(path, changes)
            elif name.endswith('.css') and rel_root != 'assets':
                fix_css(path, changes)
            elif name == 'manifest.json' and rel_root != '.':
                fix_manifest(path, changes)
    print('\n'.join(changes) or 'nothing to change')
    return 0


if __name__ == '__main__':
    sys.exit(main())
