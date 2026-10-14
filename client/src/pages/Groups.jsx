import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Groups() {
  const [groups, setGroups] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '' })
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { fetchGroups() }, [])

  const fetchGroups = async () => {
    try { const { data } = await axios.get('/api/groups'); setGroups(data) } catch (e) {}
  }

  const createGroup = async (e) => {
    e.preventDefault(); setError('')
    try {
      await axios.post('/api/groups', form)
      setForm({ name: '', subject: '' }); setShowCreate(false); fetchGroups()
    } catch (e) { setError(e.response?.data?.message || 'Error') }
  }

  const joinGroup = async (e) => {
    e.preventDefault(); setError('')
    try {
      await axios.post('/api/groups/join', { inviteCode })
      setInviteCode(''); setShowJoin(false); fetchGroups()
    } catch (e) { setError(e.response?.data?.message || 'Invalid code') }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups 👥</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowJoin(s => !s); setShowCreate(false) }} className="btn-secondary">Join via Code</button>
          <button onClick={() => { setShowCreate(s => !s); setShowJoin(false) }} className="btn-primary">+ Create Group</button>
        </div>
      </div>

      {showCreate && (
        <div className="card">
          <h2 className="font-semibold mb-3">Create Group</h2>
          <form onSubmit={createGroup} className="space-y-3">
            <input className="input" placeholder="Group Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            <input className="input" placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showJoin && (
        <div className="card">
          <h2 className="font-semibold mb-3">Join Group</h2>
          <form onSubmit={joinGroup} className="space-y-3">
            <input className="input" placeholder="Invite Code (e.g. AB12CD)" value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())} required />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">Join</button>
              <button type="button" onClick={() => setShowJoin(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-gray-500">No groups yet. Create one or join via invite code.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => (
            <Link key={g._id} to={`/groups/${g._id}`} className="card hover:shadow-md transition-shadow block">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center text-xl">👥</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{g.name}</h3>
                  {g.subject && <p className="text-blue-600 text-xs">{g.subject}</p>}
                  <p className="text-gray-400 text-xs mt-1">{g.members?.length} members</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-lg font-mono">{g.inviteCode}</span>
                <span className="text-blue-600 text-xs">Open →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
