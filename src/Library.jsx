import { useCallback, useEffect, useRef, useState } from 'react'
import { addBook, formatSize, keepStorage, listBooks, removeBook, storageInfo } from './db.js'

export default function Library({ onOpen }) {
  const [books, setBooks] = useState([])
  const [info, setInfo] = useState(null)
  const [error, setError] = useState('')
  const [over, setOver] = useState(false)
  const input = useRef(null)

  const refresh = useCallback(async () => {
    try {
      setBooks(await listBooks())
      setInfo(await storageInfo())
    } catch {
      setError('This browser is blocking on-device storage (private mode?). Try a normal window.')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function importFiles(fileList) {
    setError('')
    const pdfs = [...fileList].filter((f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name))
    if (!pdfs.length) return setError('Please choose PDF files.')
    for (const f of pdfs) {
      try {
        await addBook(f)
      } catch {
        setError(`Couldn’t save “${f.name}”. The device may be out of storage.`)
      }
    }
    keepStorage()
    refresh()
  }

  async function remove(book) {
    if (!confirm(`Remove “${book.name}” from this device?`)) return
    await removeBook(book.id)
    refresh()
  }

  return (
    <main className="library">
      <h1>My PDF Library</h1>
      <p className="muted">
        Books you add are saved on this device, so you can read them again later, even with no internet.
      </p>

      <div
        className={'drop' + (over ? ' over' : '')}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          importFiles(e.dataTransfer.files)
        }}
      >
        <button className="primary" onClick={() => input.current.click()}>
          Add PDF books
        </button>
        <p className="muted small">Or drop PDF files here</p>
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            importFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {books.length === 0 && <p className="muted">No books yet. Add a PDF to get started.</p>}

      {books.map((b) => (
        <div className="book" key={b.id}>
          <div className="info" onClick={() => onOpen(b.id)}>
            <div className="title">{b.name}</div>
            <div className="muted small">
              {formatSize(b.size)}
              {b.pages ? ` · page ${b.page} of ${b.pages}` : ' · not opened yet'}
            </div>
            <div className="progress">
              <i style={{ width: (b.pages ? Math.round((b.page / b.pages) * 100) : 0) + '%' }} />
            </div>
          </div>
          <button className="ghost" onClick={() => remove(b)}>
            Delete
          </button>
        </div>
      ))}

      {info && (
        <p className="muted small storage">
          Stored on this device: {formatSize(info.usage)}
          {info.quota ? ` used of about ${formatSize(info.quota)} available.` : '.'}
        </p>
      )}
    </main>
  )
}
