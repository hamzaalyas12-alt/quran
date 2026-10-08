import fs from 'fs';
import path from 'path';

try {
  const assetsDir = './dist/assets';

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);
    const cssFile = files.find(f => f.endsWith('.css'));
    const jsFile = files.find(f => f.endsWith('.js'));

    if (cssFile && jsFile) {
      const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
      const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

      if (!fs.existsSync('./android_assets')) fs.mkdirSync('./android_assets', { recursive: true });
      if (!fs.existsSync('./android_assets/assets')) fs.mkdirSync('./android_assets/assets', { recursive: true });

      // Separate assets
      fs.writeFileSync('./android_assets/assets/app.css', cssContent);
      fs.writeFileSync('./android_assets/assets/app.js', jsContent);

      // Single Standalone index.html (Works 100% offline in Android Studio WebView with 0 config)
      const standaloneHtml = `<!doctype html>
<html lang="en" class="h-full bg-[#F7F5F0]">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0F766E" />
    <title>Halqa Tracker</title>
    <meta name="description" content="Offline Quran class progress and recitation scoring tracker for Halqa circles." />
    <style>
${cssContent}
    </style>
  </head>
  <body class="h-full bg-[#F7F5F0] text-[#1A1F26] antialiased overscroll-y-none select-none">
    <div id="root" class="h-full"></div>
    <script>
${jsContent}
    </script>
  </body>
</html>`;

      fs.writeFileSync('./android_assets/index.html', standaloneHtml);

      // Multi-file index.html
      const multiFileHtml = `<!doctype html>
<html lang="en" class="h-full bg-[#F7F5F0]">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <meta name="theme-color" content="#0F766E" />
    <title>Halqa Tracker</title>
    <meta name="description" content="Offline Quran class progress and recitation scoring tracker for Halqa circles." />
    <link rel="stylesheet" href="./assets/app.css">
  </head>
  <body class="h-full bg-[#F7F5F0] text-[#1A1F26] antialiased overscroll-y-none select-none">
    <div id="root" class="h-full"></div>
    <script defer src="./assets/app.js"></script>
  </body>
</html>`;

      fs.writeFileSync('./android_assets/index_multifile.html', multiFileHtml);

      console.log('[Android Bundle] Prepared standalone android_assets/index.html successfully');
    }
  }
} catch (err) {
  console.warn('[Android Bundle] Optional android asset packaging skipped:', err.message);
}

