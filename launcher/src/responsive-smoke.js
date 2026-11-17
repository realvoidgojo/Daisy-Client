const fs = require("node:fs");
const path = require("node:path");

function prepareResponsiveSmoke({ nativeImage, setOfflineAccount, readInstances, writeInstances, readSettings, writeSettings, version }) {
  const pixels = Buffer.alloc(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const offset = (y * 64 + x) * 4;
    pixels[offset] = y < 16 ? 100 : 210;
    pixels[offset + 1] = y < 16 ? 160 : 110;
    pixels[offset + 2] = y < 16 ? 210 : 90;
    pixels[offset + 3] = 255;
  }
  const skin = nativeImage.createFromBitmap(pixels, { width: 64, height: 64 }).toDataURL();
  setOfflineAccount("LayoutPlayer", skin);
  writeSettings({ ...readSettings(), tutorialCompleted: true, lastSeenChangelogVersion: version });
  const instances = readInstances();
  instances[0].name = "Daisy survival with friends and a longer instance name";
  writeInstances(instances);
}

async function verifyResponsiveHome(window, report) {
  const results = [];
  for (const [width, zoom] of [[1920, 1], [1280, 1], [1279, 1], [1100, 1], [960, 1], [960, 1.5]]) {
    window.setContentSize(width, 900);
    window.webContents.setZoomFactor(zoom);
    await new Promise(resolve => setTimeout(resolve, 650));
    const result = await window.webContents.executeJavaScript(`(() => {
      const hero = document.querySelector('.home-hero');
      const avatar = document.querySelector('.home-hero-avatar');
      const content = document.querySelector('.home-hero-content');
      if (!hero || !avatar || !content) throw new Error('Home avatar fixture did not render');
      avatar.scrollIntoView({block:'nearest'});
      const h = hero.getBoundingClientRect(), a = avatar.getBoundingClientRect(), c = content.getBoundingClientRect();
      const visible = getComputedStyle(avatar).display !== 'none' && a.width > 0 && a.height > 0;
      const contained = a.left >= h.left && a.right <= h.right && a.top >= h.top && a.bottom <= h.bottom;
      const separated = c.right <= a.left + 1 || c.bottom <= a.top + 1;
      const modelLoaded = avatar.querySelectorAll('[style*="background-image"]').length > 0;
      const noHorizontalOverflow = document.querySelector('#root').scrollWidth <= innerWidth;
      if (!visible || !contained || !separated || !modelLoaded || !noHorizontalOverflow) {
        throw new Error(JSON.stringify({visible, contained, separated, modelLoaded, noHorizontalOverflow, width:innerWidth}));
      }
      return {width:innerWidth, avatarWidth:a.width, avatarHeight:a.height, stacked:c.bottom <= a.top + 1};
    })()`);
    const screenshot = report.replace(/\.png$/, `-${width}-${zoom}.png`);
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
    results.push({ ...result, windowWidth: width, zoom, screenshot: path.basename(screenshot) });
  }
  fs.writeFileSync(report.replace(/\.png$/, "-responsive.json"), JSON.stringify(results, null, 2));
  console.log("DAISY_RESPONSIVE_OK", JSON.stringify(results));
}

module.exports = { prepareResponsiveSmoke, verifyResponsiveHome };
