import os
import zipfile
import json

with open('launcher/src/assets/daisy-logo.png', 'rb') as f:
    daisy_icon_data = f.read()

VERSIONS = [
    '1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4', '1.21.5',
    '1.21.6', '1.21.7', '1.21.8', '1.21.10', '1.21.11', '26.1.2', '26.2'
]

def update_jar(jar_path):
    if not os.path.exists(jar_path):
        return
    temp_path = jar_path + '.tmp'
    with zipfile.ZipFile(jar_path, 'r') as zin:
        with zipfile.ZipFile(temp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'fabric.mod.json':
                    raw = zin.read(item.filename).decode('utf-8')
                    try:
                        data = json.loads(raw)
                        data['name'] = 'Daisy'
                        mod_json = json.dumps(data, indent=2)
                    except Exception as e:
                        mod_json = raw.replace('"Fabric + Daisy"', '"Daisy"').replace('"River Client"', '"Daisy"')
                    zout.writestr(item, mod_json.encode('utf-8'))
                elif item.filename in ['assets/clientcore/icon.png', 'assets/river/icon.png']:
                    zout.writestr(item, daisy_icon_data)
                else:
                    zout.writestr(item, zin.read(item.filename))
    os.remove(jar_path)
    os.rename(temp_path, jar_path)
    print(f'Updated {jar_path}')

for v in VERSIONS:
    p = os.path.join('versions', v, 'build', 'libs', f'daisy-client-0.2.8.1+{v}.jar')
    if os.path.exists(p):
        update_jar(p)

print('All version jars in versions/ updated.')

