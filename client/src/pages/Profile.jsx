import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import socket from '../socket'

export default function Profile() {
  const { id } = useParams()
  const { user: me } = useAuth()
  const userId = id || me?._id
  const isMe = !id || id === me?._id

  const [profile, setProfile] = useState(null)
  const [doubts, setDoubts] = useState([])
  const [myDoubts, setMyDoubts] = useState([])
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const [doubtForm, setDoubtForm] = useState({ topic: '', description: '', subject: '' })
  const [showDoubtForm, setShowDoubtForm] = useState(false)
  const [reply, setReply] = useState({})
  const [tab, setTab] = useState('doubts')

  useEffect(() => {
    fetchProfile()
    if (isMe) {
      axios.get('/api/doubts').then(r => setDoubts(r.data)).catch(() => {})
      axios.get('/api/doubts/mine').then(r => setMyDoubts(r.data)).catch(() => {})
    }
  }, [userId])

  useEffect(() => {
    const handleNewDoubt = (newDoubt) => {
      setDoubts(ds => [newDoubt, ...ds.filter(d => d._id !== newDoubt._id)])
      if (newDoubt.postedBy === me?._id) {
        setMyDoubts(ds => [newDoubt, ...ds.filter(d => d._id !== newDoubt._id)])
      }
    }
    const handleReply = (updatedDoubt) => {
      setDoubts(ds => ds.map(d => d._id === updatedDoubt._id ? updatedDoubt : d))
      setMyDoubts(ds => ds.map(d => d._id === updatedDoubt._id ? updatedDoubt : d))
    }
    const handleResolve = (updatedDoubt) => {
      setDoubts(ds => ds.map(d => d._id === updatedDoubt._id ? updatedDoubt : d))
      setMyDoubts(ds => ds.map(d => d._id === updatedDoubt._id ? updatedDoubt : d))
    }
    socket.on('doubt:new', handleNewDoubt)
    socket.on('doubt:reply', handleReply)
    socket.on('doubt:resolve', handleResolve)
    return () => {
      socket.off('doubt:new', handleNewDoubt)
      socket.off('doubt:reply', handleReply)
      socket.off('doubt:resolve', handleResolve)
    }
  }, [me?._id])

  const fetchProfile = async () => {
    try {
      const { data } = await axios.get(`/api/users/profile/${userId}`)
      setProfile(data); setForm({ college: data.college, branch: data.branch, subjects: data.subjects?.join(', '), availability: data.availability })
    } catch (e) {}
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    try {
      await axios.put('/api/users/profile', { ...form, subjects: form.subjects?.split(',').map(s => s.trim()).filter(Boolean) })
      setEditing(false); fetchProfile()
    } catch (e) {}
  }

  const postDoubt = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/doubts', doubtForm)
      setDoubtForm({ topic: '', description: '', subject: '' }); setShowDoubtForm(false)
      axios.get('/api/doubts/mine').then(r => setMyDoubts(r.data))
    } catch (e) {}
  }

  const addReply = async (doubtId) => {
    if (!reply[doubtId]?.trim()) return
    try {
      await axios.post(`/api/doubts/${doubtId}/reply`, { text: reply[doubtId] })
      setReply(r => ({ ...r, [doubtId]: '' }))
      axios.get('/api/doubts').then(r => setDoubts(r.data))
    } catch (e) {}
  }

  const resolveDoubt = async (doubtId) => {
    try {
      await axios.put(`/api/doubts/${doubtId}/resolve`)
      axios.get('/api/doubts/mine').then(r => setMyDoubts(r.data))
    } catch (e) {}
  }

  const acceptRequest = async (fromId) => {
    try { await axios.post(`/api/users/accept/${fromId}`); fetchProfile() } catch (e) {}
  }

  const rejectRequest = async (fromId) => {
    try { await axios.post(`/api/users/reject/${fromId}`); fetchProfile() } catch (e) {}
  }

  if (!profile) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
            {profile.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile.username}</h1>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg">{profile.level}</span>
            </div>
            <p className="text-gray-500 text-sm">{profile.college || 'No college'} · {profile.branch || 'No branch'}</p>
            {profile.subjects?.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {profile.subjects.map(s => <span key={s} className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg">{s}</span>)}
              </div>
            )}
          </div>
          {isMe && <button onClick={() => setEditing(e => !e)} className="btn-secondary text-sm">✏️ Edit</button>}
        </div>

        {editing && (
          <form onSubmit={saveProfile} className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <input className="input" placeholder="College" value={form.college || ''} onChange={e => setForm(f => ({ ...f, college: e.target.value }))} />
            <input className="input" placeholder="Branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} />
            <input className="input" placeholder="Subjects (comma separated)" value={form.subjects || ''} onChange={e => setForm(f => ({ ...f, subjects: e.target.value }))} />
            <input className="input" placeholder="Availability" value={form.availability || ''} onChange={e => setForm(f => ({ ...f, availability: e.target.value }))} />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {[
            { label: 'Notes', value: profile.notesUploaded },
            { label: 'Tests', value: profile.testsTaken },
            { label: 'Tasks', value: profile.tasksCompleted },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-blue-600">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Friend Requests */}
      {isMe && profile.friendRequests?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Friend Requests <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{profile.friendRequests.length}</span></h2>
          <div className="space-y-2">
            {profile.friendRequests.map(r => {
              const reqId = r._id || r
              const reqName = r.username || 'Study Partner'
              return (
                <div key={reqId} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                      {reqName[0]?.toUpperCase()}
                    </div>
                    <p className="text-sm font-medium">{reqName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(reqId)} className="btn-primary text-xs">Accept</button>
                    <button onClick={() => rejectRequest(reqId)} className="btn-secondary text-xs text-red-500 hover:text-red-600">Decline</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Friends */}
      {profile.friends?.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-3">Study Partners ({profile.friends.length})</h2>
          <div className="flex flex-wrap gap-2">
            {profile.friends.map(f => (
              <div key={f._id} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-1.5">
                <div className="w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xs font-bold">{f.username?.[0]?.toUpperCase()}</div>
                <span className="text-sm">{f.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Doubts Section */}
      {isMe && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Doubts ❓</h2>
            <button onClick={() => setShowDoubtForm(s => !s)} className="btn-primary text-sm">+ Post Doubt</button>
          </div>

          {showDoubtForm && (
            <form onSubmit={postDoubt} className="space-y-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <input className="input" placeholder="Topic" value={doubtForm.topic} onChange={e => setDoubtForm(f => ({ ...f, topic: e.target.value }))} required />
              <input className="input" placeholder="Subject" value={doubtForm.subject} onChange={e => setDoubtForm(f => ({ ...f, subject: e.target.value }))} />
              <textarea className="input resize-none min-h-20" placeholder="Describe your doubt..." value={doubtForm.description} onChange={e => setDoubtForm(f => ({ ...f, description: e.target.value }))} required />
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm">Post</button>
                <button type="button" onClick={() => setShowDoubtForm(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          )}

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-4">
            {['doubts', 'mine'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-lg text-sm transition-all ${tab === t ? 'bg-white dark:bg-gray-600 shadow text-blue-600' : 'text-gray-500'}`}>
                {t === 'doubts' ? 'Feed' : 'My Doubts'}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {(tab === 'doubts' ? doubts : myDoubts).map(d => (
              <div key={d._id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{d.postedByUsername}</span>
                      {!d.resolved && <span className="w-2 h-2 bg-red-500 rounded-full" />}
                      {d.resolved && <span className="text-green-500 text-xs">✅</span>}
                    </div>
                    <p className="font-medium text-sm mt-0.5">{d.topic}</p>
                    <p className="text-gray-500 text-xs">{d.description}</p>
                  </div>
                  {tab === 'mine' && !d.resolved && (
                    <button onClick={() => resolveDoubt(d._id)} className="text-green-600 text-xs hover:underline shrink-0">Resolve ✅</button>
                  )}
                </div>
                {d.replies?.length > 0 && (
                  <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-200 dark:border-gray-600">
                    {d.replies.map((r, i) => (
                      <p key={i} className="text-xs"><span className="font-medium">{r.username}:</span> {r.text}</p>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <input className="input text-xs py-1 flex-1" placeholder="Reply..." value={reply[d._id] || ''}
                    onChange={e => setReply(r => ({ ...r, [d._id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addReply(d._id) }} />
                  <button onClick={() => addReply(d._id)} className="btn-primary text-xs px-3 py-1">Reply</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
