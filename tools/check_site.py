#!/usr/bin/env python3
"""Static checks for the site under src/ (run locally or in CI).

1. every .json / .webmanifest file parses
2. every local src/href in HTML and url() in CSS points at a file that exists
3. every province listed in a served state.json has an entry in src/api/config.php
4. service-worker precache revisions match the files (tools/update_sw_revisions.py)
5. gas24 pages carry the Google Analytics tag; sitemap.xml parses and lists existing pages
6. the app's popup banner settings (src/my/banner.json) are usable
"""
import datetime
import json
import os
import re
import subprocess
import sys

REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(REPO, 'src')
# Lists the apps actually fetch (state2.json is an unused draft of all provinces).
SERVED_STATE_FILES = ['state.json', 'app/state.json', 'my/state.json', 'my/app/state.json', 'my/assets/state.json']
GA_ID = 'G-9L8FG6MYMX'
with open(os.path.join(REPO, 'apps', 'landing', 'src', 'provinces.json'), encoding='utf-8') as _f:
    PROVINCE_PAGES = [p['key'] for p in json.load(_f)]
GA_PAGES = ['index.html', 'app/index.html', 'my/index.html', 'my/app/index.html', 'test/index.html'] + [
    f'{p}/index.html' for p in PROVINCE_PAGES]
HTML_REF = re.compile(r'''(?:src|href)=["']([^"']+)["']''')
CSS_REF = re.compile(r'''url\(\s*["']?([^"')]+)["']?\s*\)''')
EXTERNAL = ('http://', 'https://', '//', 'data:', 'mailto:', 'tel:', '#', 'javascript:')

errors = []


def walk(exts):
    for root, dirs, files in os.walk(SRC):
        for name in files:
            if name.endswith(exts):
                yield os.path.join(root, name)


def check_ref(owner, ref, base_dir):
    if not ref or ref.startswith(EXTERNAL):
        return
    path = ref.split('#')[0].split('?')[0]
    # src/my is the document root of my.gas24.ir; everything else is served from src/.
    my_root = os.path.join(SRC, 'my')
    root = my_root if os.path.commonpath([owner, my_root]) == my_root else SRC
    target = os.path.join(root, path.lstrip('/')) if path.startswith('/') else os.path.join(base_dir, path)
    if not os.path.exists(target):
        errors.append(f'broken reference in {os.path.relpath(owner, SRC)}: {ref}')


def main():
    for path in walk(('.json', '.webmanifest')):
        try:
            with open(path, encoding='utf-8') as f:
                json.load(f)
        except ValueError as e:
            errors.append(f'invalid JSON {os.path.relpath(path, SRC)}: {e}')

    for path in walk(('.html',)):
        with open(path, encoding='utf-8') as f:
            for ref in HTML_REF.findall(f.read()):
                check_ref(path, ref, os.path.dirname(path))
    for path in walk(('.css',)):
        with open(path, encoding='utf-8') as f:
            for ref in CSS_REF.findall(f.read()):
                check_ref(path, ref, os.path.dirname(path))

    dump = subprocess.run(
        ['php', '-r', 'define("GAS24_GATEWAY", true); echo json_encode(require "src/api/config.php");'],
        cwd=REPO, capture_output=True, text=True, check=True,
    )
    config = json.loads(dump.stdout)
    known = set(config['provinces']) | set(config['aliases'])
    for rel in SERVED_STATE_FILES:
        with open(os.path.join(SRC, rel), encoding='utf-8') as f:
            try:
                provinces = json.load(f)
            except ValueError:
                continue  # already reported above
        for item in provinces:
            sub = re.sub(r'^https?://', '', item['baseUrl']).split('.')[0]
            if sub not in known:
                errors.append(f'{rel}: province "{sub}" ({item["name"]}) has no entry in src/api/config.php')

    # Popup banner of the app (src/my/banner.json, edited by hand): catch mistakes before users do.
    banner_path = os.path.join(SRC, 'my', 'banner.json')
    try:
        with open(banner_path, encoding='utf-8') as f:
            banners = json.load(f).get('banners')
    except FileNotFoundError:
        banners = []
    except (ValueError, AttributeError):
        banners = []  # invalid JSON is already reported above
    if not isinstance(banners, list):
        errors.append('my/banner.json: "banners" must be a list')
        banners = []
    seen_ids = set()
    for i, b in enumerate(banners):
        where = f'my/banner.json banner {i + 1}'
        if not isinstance(b, dict) or not b.get('id') or not b.get('image'):
            errors.append(f'{where}: needs "id" and "image"')
            continue
        if b['id'] in seen_ids:
            errors.append(f'{where}: id "{b["id"]}" is used twice')
        seen_ids.add(b['id'])
        image = b['image']
        if b.get('enabled', True) and image.startswith('/') and not os.path.exists(os.path.join(SRC, 'my', image.lstrip('/'))):
            errors.append(f'{where}: image {image} does not exist in src/my')
        link = (b.get('link') or '').strip()
        if link and not (re.match(r'^https?://', link) or (link.startswith('/') and not link.startswith('//'))):
            errors.append(f'{where}: link must start with https:// or / (got {link})')
        if 'maxViews' in b and not (isinstance(b['maxViews'], int) and b['maxViews'] >= 1):
            errors.append(f'{where}: maxViews must be a whole number of at least 1')
        for key in b.get('provinces') or []:
            if key not in known:
                errors.append(f'{where}: unknown province "{key}"')
        for field in ('from', 'until'):
            if b.get(field):
                try:
                    datetime.datetime.fromisoformat(b[field])
                except ValueError:
                    errors.append(f'{where}: {field} "{b[field]}" is not a date like 2026-12-20')

    # Google Analytics must stay on every gas24 page (a fresh province build would drop it).
    for rel in GA_PAGES:
        with open(os.path.join(SRC, rel), encoding='utf-8') as f:
            if GA_ID not in f.read():
                errors.append(f'{rel}: Google Analytics tag ({GA_ID}) is missing')

    # sitemap.xml must parse and point only at pages that exist.
    import xml.etree.ElementTree as ET
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    try:
        urls = [u.text for u in ET.parse(os.path.join(SRC, 'sitemap.xml')).findall('s:url/s:loc', ns)]
    except (ET.ParseError, OSError) as e:
        errors.append(f'sitemap.xml: {e}')
        urls = []
    for url in urls:
        host = re.sub(r'^https://', '', url).split('/')[0]
        folder = '' if host == 'gas24.ir' else host.split('.')[0]
        if not os.path.exists(os.path.join(SRC, folder, 'index.html')):
            errors.append(f'sitemap.xml lists {url} but src/{folder}/index.html does not exist')

    # A missing precache URL makes the whole service worker install fail.
    for sw in ('sw.js', 'my/sw.js'):
        with open(os.path.join(SRC, sw), encoding='utf-8') as f:
            for url in re.findall(r'\{url:"([^"]+)",revision:', f.read()):
                if not os.path.exists(os.path.join(SRC, os.path.dirname(sw), url)):
                    errors.append(f'{sw} precaches missing file {url}')

    revisions = subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'update_sw_revisions.py'), '--check'],
                               capture_output=True, text=True)
    if revisions.returncode:
        errors.append('service worker precache revisions are stale; run tools/update_sw_revisions.py\n'
                      + revisions.stdout.strip())

    for e in errors:
        print('ERROR', e)
    print(f'{len(errors)} problem(s) found' if errors else 'site checks passed')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
