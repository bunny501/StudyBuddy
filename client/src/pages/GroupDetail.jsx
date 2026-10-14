import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import socket from '../socket'

export default function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [group, setGroup] = useState(null)
  const [tab, setTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [msg, setMsg] = useState('')
  const [notes, setNotes] = useState([])
  const [noteForm, setNoteForm] = useState({ title: '', subject: '', content: '' })
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', assignedTo: '' })
  const messagesEndRef = useRef()

  const leaveGroup = async () => {
    if (!window.confirm(`Are you sure you want to leave ${group?.name || 'this group'}?`)) return
    try {
      await axios.post(`/api/groups/${id}/leave`)
      navigate('/groups')
    } catch (e) {}
  }

  useEffect(() => {
    fetchGroup()
    fetchMessages()
    fetchNotes()
    socket.emit('group:join', id)
    const handleReceive = (m) => {
      if (!m.groupId || m.groupId === id) {
        setMessages(ms => [...ms, m])
      }
    }
    socket.on('group:receive', handleReceive)
    return () => {
      socket.off('group:receive', handleReceive)
      socket.emit('group:leave', id)
    }
  }, [id])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchGroup = async () => {
    try { const { data } = await axios.get(`/api/groups/${id}`); setGroup(data) } catch (e) {}
  }
  const fetchMessages = async () => {
    try { const { data } = await axios.get(`/api/messages/group/${id}`); setMessages(data) } catch (e) {}
  }
  const fetchNotes = async () => {
    try { const { data } = await axios.get(`/api/notes/group/${id}`); setNotes(data) } catch (e) {}
  }

  const sendMsg = (e) => {
    e.preventDefault()
    if (!msg.trim()) return
    socket.emit('group:send', { from: user._id, fromUsername: user.username, groupId: id, text: msg })
    setMsg('')
  }

  const addNote = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/notes', { ...noteForm, groupId: id })
      setNoteForm({ title: '', subject: '', content: '' }); setShowNoteForm(false); fetchNotes()
    } catch (e) {}
  }

  const addTask = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`/api/groups/${id}/task`, taskForm)
      setGroup(data); setTaskForm({ title: '', assignedTo: '' })
    } catch (e) {}
  }

  const toggleTask = async (taskId, status) => {
    try {
      const { data } = await axios.put(`/api/groups/${id}/task/${taskId}`, { status: status === 'pending' ? 'completed' : 'pending' })
      setGroup(data)
    } catch (e) {}
  }

  if (!group) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center text-xl">👥</div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{group.name}</h1>
          <p className="text-gray-400 text-sm">{group.members?.length} members · Code: <span className="font-mono text-blue-600 font-semibold">{group.inviteCode}</span></p>
        </div>
        <button onClick={leaveGroup} className="btn-secondary text-xs text-red-500 hover:text-red-600 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20">
          Leave Group
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 gap-1">
        {['chat', 'notes', 'tasks'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`}>
            {t === 'chat' ? '💬 Chat' : t === 'notes' ? '📒 Notes' : '✅ Tasks'}
          </button>
        ))}
      </div>

      {/* Chat */}
      {tab === 'chat' && (
        <div className="card flex flex-col h-96">
          <div className="flex-1 overflow-y-auto space-y-2 mb-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.fromUsername === user.username ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.fromUsername === user.username ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {m.fromUsername !== user.username && <p className="text-xs font-medium text-blue-600 mb-0.5">{m.fromUsername}</p>}
                  <p>{m.text}</p>
                  <p className={`text-xs mt-0.5 ${m.fromUsername === user.username ? 'text-blue-200' : 'text-gray-400'}`}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMsg} className="flex gap-2">
            <input className="input flex-1" placeholder="Type a message..." value={msg} onChange={e => setMsg(e.target.value)} />
            <button type="submit" className="btn-primary px-4">Send</button>
          </form>
        </div>
      )}

      {/* Notes */}
      {tab === 'notes' && (
        <div className="space-y-4">
          <button onClick={() => setShowNoteForm(s => !s)} className="btn-primary">+ Add Note</button>
          {showNoteForm && (
            <div className="card">
              <form onSubmit={addNote} className="space-y-3">
                <input className="input" placeholder="Title" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} required />
                <input className="input" placeholder="Subject" value={noteForm.subject} onChange={e => setNoteForm(f => ({ ...f, subject: e.target.value }))} required />
                <textarea className="input min-h-24 resize-none" placeholder="Content..." value={noteForm.content} onChange={e => setNoteForm(f => ({ ...f, content: e.target.value }))} required />
                <button type="submit" className="btn-primary">Save</button>
              </form>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            {notes.map(n => (
              <div key={n._id} className="card">
                <div className="flex items-start gap-2">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-blue-600 text-xs">{n.subject}</p>
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">{n.summary}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-medium mb-3">Assign Task</h3>
            <form onSubmit={addTask} className="flex gap-2 flex-wrap">
              <input className="input flex-1 min-w-32" placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} required />
              <input className="input flex-1 min-w-32" placeholder="Assign to (username)" value={taskForm.assignedTo} onChange={e => setTaskForm(f => ({ ...f, assignedTo: e.target.value }))} />
              <button type="submit" className="btn-primary">Add</button>
            </form>
          </div>
          <div className="space-y-2">
            {group.tasks?.map(t => (
              <div key={t._id} className="card flex items-center gap-3">
                <button onClick={() => toggleTask(t._id, t.status)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${t.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                  {t.status === 'completed' && <span className="text-white text-xs">✓</span>}
                </button>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : ''}`}>{t.title}</p>
                  {t.assignedTo && <p className="text-xs text-gray-400">→ {t.assignedTo}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-lg ${t.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
