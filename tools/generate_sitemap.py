#!/usr/bin/env python3
"""Writes src/sitemap.xml and the robots.txt files for gas24.ir and its province subdomains.

The outer proxy serves <province>.gas24.ir from src/<province>/, so each subdomain gets its own
robots.txt (src/<province>/robots.txt). Every robots.txt points at https://gas24.ir/sitemap.xml;
that cross-reference is what lets one sitemap on gas24.ir list pages on the subdomains.
lastmod is the date of the last commit that touched the page's folder.
Runs as part of tools/deploy_landings.sh; by hand: python3 tools/generate_sitemap.py
"""
import datetime
import json
import os
import subprocess

REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(REPO, 'src')
SITEMAP_URL = 'https://gas24.ir/sitemap.xml'
# Every province with a landing page (apps/landing/src/provinces.json).
with open(os.path.join(REPO, 'apps', 'landing', 'src', 'provinces.json'), encoding='utf-8') as _f:
    PROVINCES = [p['key'] for p in json.load(_f)]
# On gas24.ir itself these paths are the API, the app, or copies of the subdomain pages.
MAIN_DISALLOW = ['/api/', '/app/', '/my/', '/test/', '/testapi/'] + [f'/{p}/' for p in PROVINCES]


def last_modified(path):
    out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path], cwd=REPO,
                         capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()


def main():
    pages = [('https://gas24.ir/', 'index.html', '1.0')]
    pages += [(f'https://{p}.gas24.ir/', f'{p}/index.html', '0.8') for p in PROVINCES]
    entries = []
    for url, rel, priority in pages:
        path = os.path.join('src', rel)
        # a province page is its whole folder; the main page is only its own file
        tracked = path if rel == 'index.html' else os.path.dirname(path)
        entries.append(
            f'  <url>\n    <loc>{url}</loc>\n    <lastmod>{last_modified(tracked)}</lastmod>\n'
            f'    <changefreq>weekly</changefreq>\n    <priority>{priority}</priority>\n  </url>')
    with open(os.path.join(SRC, 'sitemap.xml'), 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + '\n'.join(entries) + '\n</urlset>\n')

    main_robots = 'User-agent: *\n' + ''.join(f'Disallow: {d}\n' for d in MAIN_DISALLOW) + f'\nSitemap: {SITEMAP_URL}\n'
    with open(os.path.join(SRC, 'robots.txt'), 'w', encoding='utf-8') as f:
        f.write(main_robots)
    for p in PROVINCES:
        with open(os.path.join(SRC, p, 'robots.txt'), 'w', encoding='utf-8') as f:
            f.write(f'User-agent: *\nDisallow: /api/\n\nSitemap: {SITEMAP_URL}\n')
    print(f'sitemap.xml: {len(pages)} pages; robots.txt for gas24.ir and {len(PROVINCES)} subdomains')


if __name__ == '__main__':
    main()
