# My PDF Library

A React + Vite app for reading PDF books on a phone or laptop. Black background, white text. Books you add are saved on the device itself (browser IndexedDB), so there is no server and no database to run. After the first visit it works offline, and you can install it to the home screen.

## Features
- Add one or many PDFs (button or drag and drop). They are stored on the device.
- Library with a progress bar for each book. Remembers the last page of every book.
- Reader: next/previous, page box, zoom, swipe left/right, arrow keys.
- Night pages button (◐): inverts the white pages to dark. Turn it off to see normal pages.
- Installable PWA with a service worker, so the app opens offline.

## Run it on your computer
```bash
npm install
npm run dev        # development at http://localhost:5173
npm run build      # creates the dist/ folder
npm run preview    # test the built, offline-capable version
```

## Host it
Upload the contents of `dist/` to any static host that serves HTTPS (HTTPS is required for offline/installing):
- Netlify or Cloudflare Pages: drag and drop the `dist` folder, or connect your GitHub repo (build command `npm run build`, output folder `dist`).
- Vercel: import the repo; it detects Vite automatically.
- GitHub Pages: publish the `dist` folder.

## Use it on a phone
1. Open your hosted link once while online. Wait for the page to load fully.
2. Android (Chrome): menu, then "Install app" or "Add to Home screen".
   iPhone (Safari): Share, then "Add to Home Screen".
3. Open the app, tap "Add PDF books", and pick files from the phone.
4. After that it works with no internet.

## Good to know
- Books are stored per device and per browser. A book added on your laptop will not appear on your phone.
- Clearing the browser's site data deletes the books. Installing to the home screen and the app's storage request reduce the chance of the browser clearing them on its own.
- Very large PDFs can be slow on older phones.

## Project layout
- `src/db.js` – on-device storage (IndexedDB)
- `src/Library.jsx` – book list and importing
- `src/Reader.jsx` – PDF reader (pdf.js)
- `src/styles.css` – black and white theme
- `vite.config.js` – PWA and offline setup
