#!/usr/bin/env python3
"""Copies the apps/landing build (dist/) into src/<province>/ for every province in
apps/landing/src/provinces.json and writes that province's key, title and description into
its index.html. The page reads the key from <meta name="gas24-province">.

Run through tools/deploy_landings.sh (which builds first).
"""
import html
import json
import os
import shutil
import sys

REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
APP = os.path.join(REPO, 'apps', 'landing')
DIST = os.path.join(APP, 'dist')
TOKENS = ('__GAS24_PROVINCE__', '__GAS24_TITLE__', '__GAS24_DESCRIPTION__')


def load_provinces():
    with open(os.path.join(APP, 'src', 'provinces.json'), encoding='utf-8') as f:
        return json.load(f)


def main():
    with open(os.path.join(DIST, 'index.html'), encoding='utf-8') as f:
        template = f.read()
    missing = [t for t in TOKENS if t not in template]
    if missing:
        sys.exit(f'apps/landing/dist/index.html has no {", ".join(missing)}; build apps/landing first')

    provinces = load_provinces()
    for p in provinces:
        dest = os.path.join(REPO, 'src', p['key'])
        os.makedirs(dest, exist_ok=True)
        # assets/ holds only build output; replacing it drops the previous bundles.
        # Everything else in the folder (robots.txt, icons) is left alone.
        shutil.rmtree(os.path.join(dest, 'assets'), ignore_errors=True)
        shutil.copytree(os.path.join(DIST, 'assets'), os.path.join(dest, 'assets'))

        title = f"گرمای پایدار {p['heroPlace']}"
        description = (f"پویش «گرمای پایدار» استان {p['name']}: با کاهش مصرف گاز، گازیوم بگیرید "
                       f"و در قرعه‌کشی ویژه {p['heroPlace']} شرکت کنید.")
        page = (template.replace('__GAS24_PROVINCE__', html.escape(p['key']))
                .replace('__GAS24_TITLE__', html.escape(title))
                .replace('__GAS24_DESCRIPTION__', html.escape(description)))
        with open(os.path.join(dest, 'index.html'), 'w', encoding='utf-8') as f:
            f.write(page)
    print(f"landing published to {len(provinces)} provinces: {' '.join(p['key'] for p in provinces)}")


if __name__ == '__main__':
    main()
