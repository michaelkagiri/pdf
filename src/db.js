// On-device storage using IndexedDB, which is built into every modern browser.
// Two stores: "meta" (title, size, last page) and "files" (the PDF bytes).

let dbPromise

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('pdf-library', 1)
      req.onupgradeneeded = () => {
        req.result.createObjectStore('meta', { keyPath: 'id', autoIncrement: true })
        req.result.createObjectStore('files')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

const request = (r) =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })

const finished = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = tx.onabort = () => reject(tx.error)
  })

export async function listBooks() {
  const db = await open()
  const books = await request(db.transaction('meta').objectStore('meta').getAll())
  return books.sort((a, b) => b.added - a.added)
}

export async function addBook(file) {
  const bytes = await file.arrayBuffer()
  const db = await open()
  const tx = db.transaction(['meta', 'files'], 'readwrite')
  const id = await request(
    tx.objectStore('meta').add({
      name: file.name.replace(/\.pdf$/i, ''),
      size: file.size,
      added: Date.now(),
      page: 1,
      pages: 0
    })
  )
  tx.objectStore('files').put(bytes, id)
  await finished(tx)
  return id
}

export async function getBook(id) {
  const db = await open()
  const meta = await request(db.transaction('meta').objectStore('meta').get(id))
  const bytes = await request(db.transaction('files').objectStore('files').get(id))
  return { meta, bytes }
}

export async function updateBook(id, patch) {
  const db = await open()
  const tx = db.transaction('meta', 'readwrite')
  const store = tx.objectStore('meta')
  const current = await request(store.get(id))
  if (current) store.put({ ...current, ...patch })
  await finished(tx)
}

export async function removeBook(id) {
  const db = await open()
  const tx = db.transaction(['meta', 'files'], 'readwrite')
  tx.objectStore('meta').delete(id)
  tx.objectStore('files').delete(id)
  await finished(tx)
}

export async function storageInfo() {
  try {
    const e = await navigator.storage.estimate()
    return { usage: e.usage || 0, quota: e.quota || 0 }
  } catch {
    return null
  }
}

// Asks the browser not to clear this site's data when the device is low on space.
export const keepStorage = () => navigator.storage?.persist?.().catch(() => {})

export const formatSize = (n) =>
  n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'
