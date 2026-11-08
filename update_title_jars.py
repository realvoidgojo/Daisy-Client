import os
import zipfile

with open('src/client/resources/assets/clientcore/textures/menu_title.png', 'rb') as f:
    title_data = f.read()

VERSIONS = [
    '1.21', '1.21.1', '1.21.2', '1.21.3', '1.21.4', '1.21.5',
    '1.21.6', '1.21.7', '1.21.8', '1.21.10', '1.21.11', '26.1.2', '26.2'
]

def update_jar_title(jar_path):
    if not os.path.exists(jar_path):
        return False
    temp_path = jar_path + '.tmp'
    updated = False
    with zipfile.ZipFile(jar_path, 'r') as zin:
        with zipfile.ZipFile(temp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == 'assets/clientcore/textures/menu_title.png':
                    zout.writestr(item, title_data)
                    updated = True
                else:
                    zout.writestr(item, zin.read(item.filename))
            if not updated:
                zout.writestr('assets/clientcore/textures/menu_title.png', title_data)
                updated = True
    os.remove(jar_path)
    os.rename(temp_path, jar_path)
    print(f'Updated title in: {jar_path}')
    return True

for v in VERSIONS:
    p = os.path.join('versions', v, 'build', 'libs', f'daisy-client-0.2.8.1+{v}.jar')
    if os.path.exists(p):
        update_jar_title(p)

print('All version jars in versions/ updated with new menu_title.png!')

