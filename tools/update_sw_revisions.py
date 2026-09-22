#!/usr/bin/env python3
"""Refresh Workbox precache revisions in src/sw.js and src/my/sw.js.

The HTML files were edited by hand after the Vite/Workbox build (analytics and
chat snippets, icons). Workbox only re-downloads a precached file when its
revision changes, so stale revisions keep old HTML on returning users' devices.
Run this after editing any precached file. `--check` exits 1 if anything is stale.
"""
import hashlib
import os
import re
import sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))
SERVICE_WORKERS = ['sw.js', os.path.join('my', 'sw.js')]
ENTRY = re.compile(r'\{url:"([^"]+)",revision:"([0-9a-f]+)"\}')


def main(check_only):
    stale = []
    for sw in SERVICE_WORKERS:
        sw_path = os.path.join(ROOT, sw)
        base = os.path.dirname(sw_path)
        with open(sw_path, encoding='utf-8') as f:
            source = f.read()

        def repl(m):
            with open(os.path.join(base, m.group(1)), 'rb') as asset:
                digest = hashlib.md5(asset.read()).hexdigest()
            if digest != m.group(2):
                stale.append(f'{sw}: {m.group(1)}')
            return f'{{url:"{m.group(1)}",revision:"{digest}"}}'

        updated = ENTRY.sub(repl, source)
        if updated != source and not check_only:
            with open(sw_path, 'w', encoding='utf-8') as f:
                f.write(updated)
    for item in stale:
        print(('stale ' if check_only else 'updated ') + item)
    return 1 if (check_only and stale) else 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
