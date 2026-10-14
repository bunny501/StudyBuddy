import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const TAG_COLORS = { confusing: 'bg-red-200 dark:bg-red-900', important: 'bg-yellow-200 dark:bg-yellow-900', insight: 'bg-blue-200 dark:bg-blue-900' }
const TAG_ICONS = { confusing: '❓', important: '⚠️', insight: '💡' }

function NoteCard({ note, onOpen }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="card cursor-pointer hover:shadow-md transition-all duration-200 relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(note)}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">📄</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{note.title}</h3>
          <p className="text-blue-600 text-xs mt-0.5">Subject: {note.subject}</p>
          <p className="text-gray-400 text-xs mt-1">{note.tags?.length || 0} tags</p>
        </div>
      </div>
      {hovered && (
        <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col justify-between border-2 border-blue-200 dark:border-blue-700 z-10">
          <div>
            <p className="font-semibold text-sm mb-1">{note.title}</p>
            <p className="text-gray-500 text-xs line-clamp-4">{note.summary || note.content?.substring(0, 150)}</p>
          </div>
          <button className="btn-primary text-sm mt-2">Open</button>
        </div>
      )}
    </div>
  )
}

function TagMenu({ onTag, onClose }) {
  return (
    <div className="absolute z-50 bg-white dark:bg-gray-800 shadow-lg rounded-xl border border-gray-200 dark:border-gray-600 p-2 flex gap-2">
      {['confusing', 'important', 'insight'].map(t => (
        <button key={t} onClick={() => { onTag(t); onClose() }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${TAG_COLORS[t]} hover:opacity-80 transition`}>
          {TAG_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
        </button>
      ))}
      <button onClick={onClose} className="px-2 py-1 text-gray-400 hover:text-gray-600 text-xs">✕</button>
    </div>
  )
}

function NoteViewer({ note, onClose, onUpdate, onDelete }) {
  const [tagMenu, setTagMenu] = useState(null)
  const [selection, setSelection] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [reply, setReply] = useState('')
  const [filterType, setFilterType] = useState('all')
  const contentRef = useRef()

  const handleSelect = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    const text = sel.toString().trim()
    if (!text) return
    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    const containerRect = contentRef.current.getBoundingClientRect()
    setSelection({ text, startIndex: range.startOffset, endIndex: range.endOffset })
    setTagMenu({ top: rect.bottom - containerRect.top + 8, left: rect.left - containerRect.left })
  }

  const addTag = async (type) => {
    if (!selection) return
    try {
      const { data } = await axios.post(`/api/notes/${note._id}/tag`, { ...selection, type })
      onUpdate(data)
      setSelection(null)
    } catch (e) { console.error(e) }
  }

  const addReply = async (tagId) => {
    if (!reply.trim()) return
    try {
      const { data } = await axios.post(`/api/notes/${note._id}/tag/${tagId}/reply`, { message: reply })
      onUpdate(data)
      setReply('')
    } catch (e) { console.error(e) }
  }

  const resolveTag = async (tagId) => {
    try {
      const { data } = await axios.put(`/api/notes/${note._id}/tag/${tagId}/resolve`)
      onUpdate(data)
    } catch (e) { console.error(e) }
  }

  const filteredTags = note.tags?.filter(t => filterType === 'all' || t.type === filterType) || []

  const renderContent = () => {
    const content = note.content || ''
    if (!note.tags || note.tags.length === 0) {
      return <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">{content}</p>
    }

    // Segment content by tags for highlighting
    return (
      <div className="text-sm leading-relaxed whitespace-pre-wrap select-text">
        {content}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs font-semibold text-gray-500 mb-2">Tagged Highlights:</p>
          <div className="flex flex-wrap gap-2">
            {note.tags.map((t, idx) => (
              <span
                key={t._id || idx}
                onClick={() => setActiveTag(t)}
                className={`cursor-pointer px-2 py-1 rounded-lg text-xs font-medium ${TAG_COLORS[t.type] || 'bg-gray-200'} ${t.resolved ? 'opacity-50 line-through' : ''}`}
              >
                {TAG_ICONS[t.type]} "{t.text}"
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="font-bold text-lg">{note.title}</h2>
            <p className="text-blue-600 text-sm">{note.subject}</p>
          </div>
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                onClick={() => onDelete(note._id)}
                className="text-red-500 hover:text-red-700 text-xs px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete note"
              >
                🗑️ Delete
              </button>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-xs text-gray-400 mb-2">Select text to tag it</p>
            <div ref={contentRef} className="relative" onMouseUp={handleSelect}>
              {renderContent()}
              {tagMenu && selection && (
                <TagMenu
                  onTag={addTag}
                  onClose={() => { setTagMenu(null); setSelection(null) }}
                />
              )}
            </div>
          </div>

          {/* Tags Panel */}
          <div className="w-72 border-l border-gray-100 dark:border-gray-700 flex flex-col">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <p className="font-medium text-sm mb-2">Tags & Discussions</p>
              <div className="flex gap-1 flex-wrap">
                {['all', 'confusing', 'important', 'insight'].map(f => (
                  <button key={f} onClick={() => setFilterType(f)}
                    className={`px-2 py-0.5 rounded-lg text-xs ${filterType === f ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    {f === 'all' ? 'All' : TAG_ICONS[f]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredTags.length === 0 && <p className="text-gray-400 text-xs">No tags yet. Select text to add one.</p>}
              {filteredTags.map(tag => (
                <div key={tag._id} className={`rounded-xl p-3 ${TAG_COLORS[tag.type]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">{TAG_ICONS[tag.type]} "{tag.text?.substring(0, 40)}{tag.text?.length > 40 ? '...' : ''}"</p>
                    {!tag.resolved && (
                      <button onClick={() => resolveTag(tag._id)} className="text-green-600 text-xs hover:underline shrink-0">✅</button>
                    )}
                  </div>
                  {tag.resolved && <p className="text-green-600 text-xs mt-1">✅ Resolved</p>}
                  <div className="mt-2 space-y-1">
                    {tag.thread?.map((t, i) => (
                      <div key={i} className="bg-white/60 dark:bg-gray-900/40 rounded-lg p-1.5">
                        <span className="font-medium text-xs">{t.username}: </span>
                        <span className="text-xs">{t.message}</span>
                      </div>
                    ))}
                  </div>
                  {activeTag === tag._id ? (
                    <div className="mt-2 flex gap-1">
                      <input className="input text-xs py-1 flex-1" placeholder="Reply..." value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { addReply(tag._id); setActiveTag(null) } }} />
                      <button onClick={() => { addReply(tag._id); setActiveTag(null) }} className="btn-primary text-xs px-2 py-1">Send</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveTag(tag._id)} className="text-xs text-blue-600 mt-1 hover:underline">💬 Reply</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyNotes() {
  const [notes, setNotes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', subject: '', content: '' })
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchNotes() }, [])

  const fetchNotes = async () => {
    try { const { data } = await axios.get('/api/notes'); setNotes(data) } catch (e) {}
  }

  const submit = async (e) => {
    e.preventDefault(); setLoading(true)
    try {
      await axios.post('/api/notes', form)
      setForm({ title: '', subject: '', content: '' })
      setShowForm(false)
      fetchNotes()
    } catch (e) {} finally { setLoading(false) }
  }

  const updateNote = (updated) => {
    setNotes(ns => ns.map(n => n._id === updated._id ? updated : n))
    setSelected(updated)
  }

  const deleteNote = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return
    try {
      await axios.delete(`/api/notes/${id}`)
      setSelected(null)
      fetchNotes()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Notes 📒</h1>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary">+ Upload Note</button>
      </div>

      {showForm && (
        <div className="card">
          <h2 className="font-semibold mb-4">New Note</h2>
          <form onSubmit={submit} className="space-y-3">
            <input className="input" placeholder="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            <input className="input" placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} required />
            <textarea className="input min-h-32 resize-none" placeholder="Content..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
            <div className="flex gap-2">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Note'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 && !showForm && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">📄</p>
          <p className="text-gray-500">No notes yet. Upload your first note!</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map(n => <NoteCard key={n._id} note={n} onOpen={setSelected} />)}
      </div>

      {selected && <NoteViewer note={selected} onClose={() => setSelected(null)} onUpdate={updateNote} onDelete={deleteNote} />}
    </div>
  )
}
