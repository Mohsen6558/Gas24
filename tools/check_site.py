#!/usr/bin/env python3
"""Static checks for the site under src/ (run locally or in CI).

1. every .json / .webmanifest file parses
2. every local src/href in HTML and url() in CSS points at a file that exists
3. every province listed in a served state.json has an entry in src/api/config.php
4. service-worker precache revisions match the files (tools/update_sw_revisions.py)
"""
import json
import os
import re
import subprocess
import sys

REPO = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
SRC = os.path.join(REPO, 'src')
# Lists the apps actually fetch (state2.json is an unused draft of all provinces).
SERVED_STATE_FILES = ['state.json', 'app/state.json', 'my/state.json', 'my/app/state.json', 'my/assets/state.json']
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
    target = os.path.join(SRC, path.lstrip('/')) if path.startswith('/') else os.path.join(base_dir, path)
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
