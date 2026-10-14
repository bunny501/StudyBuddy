import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import socket from '../socket'

export default function PartnerMatch() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [subject, setSubject] = useState('')
  const [chatUser, setChatUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [msg, setMsg] = useState('')
  const [profile, setProfile] = useState(null)
  const messagesEndRef = useRef()

  const chatUserRef = useRef(chatUser)
  useEffect(() => { chatUserRef.current = chatUser }, [chatUser])

  useEffect(() => {
    axios.get('/api/users').then(r => { setUsers(r.data); setFiltered(r.data) }).catch(() => {})
    const handleDm = (m) => {
      const activeId = chatUserRef.current?._id
      if (activeId && (m.from === activeId || m.to === activeId)) {
        setMessages(ms => [...ms, m])
      }
    }
    socket.on('dm:receive', handleDm)
    return () => socket.off('dm:receive', handleDm)
  }, [])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (!subject) setFiltered(users)
    else setFiltered(users.filter(u => u.subjects?.some(s => s.toLowerCase().includes(subject.toLowerCase()))))
  }, [subject, users])

  const openChat = async (u) => {
    setChatUser(u)
    try { const { data } = await axios.get(`/api/messages/dm/${u._id}`); setMessages(data) } catch (e) {}
  }

  const sendMsg = (e) => {
    e.preventDefault()
    if (!msg.trim() || !chatUser) return
    socket.emit('dm:send', { from: user._id, fromUsername: user.username, to: chatUser._id, toUsername: chatUser.username, text: msg })
    setMsg('')
  }

  const sendRequest = async (userId) => {
    try { await axios.post(`/api/users/request/${userId}`); alert('Friend request sent!') } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Partner Match 🤝</h1>

      <div className="flex gap-3">
        <input className="input max-w-xs" placeholder="Filter by subject..." value={subject} onChange={e => setSubject(e.target.value)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Users List */}
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-gray-500 uppercase tracking-wide">Students ({filtered.length})</h2>
          {filtered.map(u => (
            <div key={u._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-gray-400 text-xs">{u.college || 'No college'} · {u.branch || 'No branch'}</p>
                  {u.subjects?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.subjects.slice(0, 3).map(s => (
                        <span key={s} className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openChat(u)} className="btn-primary text-xs px-3 py-1">💬 Chat</button>
                  <button onClick={() => sendRequest(u._id)} className="btn-secondary text-xs px-3 py-1">+ Friend</button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-gray-400 text-sm">No students found.</p>}
        </div>

        {/* Chat Panel */}
        <div className="card flex flex-col h-96 sticky top-6">
          {chatUser ? (
            <>
              <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                  {chatUser.username[0].toUpperCase()}
                </div>
                <p className="font-medium">{chatUser.username}</p>
                <button onClick={() => setChatUser(null)} className="ml-auto text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.fromUsername === user.username ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${m.fromUsername === user.username ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMsg} className="flex gap-2">
                <input className="input flex-1" placeholder="Message..." value={msg} onChange={e => setMsg(e.target.value)} />
                <button type="submit" className="btn-primary px-4">→</button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-sm">Select a student to chat</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
