import { useState } from 'react'
import Library from './Library.jsx'
import Reader from './Reader.jsx'

export default function App() {
  const [openId, setOpenId] = useState(null)
  return openId == null ? (
    <Library onOpen={setOpenId} />
  ) : (
    <Reader id={openId} onClose={() => setOpenId(null)} />
  )
}
