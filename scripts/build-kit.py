# Rebuilds public/classroom-kit.zip (the file teachers download in Termux). Run after any change to public/ or classroom/server.mjs:
#   python3 scripts/build-kit.py
import zipfile, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, 'public', 'classroom-kit.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.write(os.path.join(root, 'classroom', 'server.mjs'), 'classroom/server.mjs')
    z.write(os.path.join(root, 'classroom', 'packs', 'README.txt'), 'classroom/packs/README.txt')
    for d, _, files in os.walk(os.path.join(root, 'public')):
        for f in files:
            p = os.path.join(d, f)
            if p == out or f.endswith('.map'): continue
            z.write(p, os.path.relpath(p, root))
print('built', out, os.path.getsize(out) // 1024, 'KB')
