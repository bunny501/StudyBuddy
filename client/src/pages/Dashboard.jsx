import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import axios from 'axios'

export default function Dashboard() {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [groups, setGroups] = useState([])
  const [doubts, setDoubts] = useState([])

  useEffect(() => {
    axios.get('/api/notes').then(r => setNotes((r.data || []).slice(0, 3))).catch(() => {})
    axios.get('/api/groups').then(r => setGroups((r.data || []).slice(0, 3))).catch(() => {})
    axios.get('/api/doubts').then(r => setDoubts((r.data || []).slice(0, 3))).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hey, {user?.username} 👋</h1>
          <p className="text-gray-500 text-sm mt-1">Ready to study?</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Notes', value: notes.length, icon: '📒', to: '/notes' },
          { label: 'Groups', value: groups.length, icon: '👥', to: '/groups' },
          { label: 'Doubts', value: doubts.length, icon: '❓', to: '/profile' },
          { label: 'Notifications', value: doubts.filter(d => !d.resolved).length, icon: '🔔', to: '/profile' },
        ].map(s => (
          <Link key={s.label} to={s.to} className="card hover:shadow-md transition-shadow">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-gray-500 text-sm">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Notes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Notes</h2>
            <Link to="/notes" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {notes.length === 0 ? (
            <p className="text-gray-400 text-sm">No notes yet. <Link to="/notes" className="text-blue-600">Upload one</Link></p>
          ) : notes.map(n => (
            <div key={n._id} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
              <span className="text-xl">📄</span>
              <div>
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-gray-400 text-xs">{n.subject}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Groups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Active Groups</h2>
            <Link to="/groups" className="text-blue-600 text-sm hover:underline">View all</Link>
          </div>
          {groups.length === 0 ? (
            <p className="text-gray-400 text-sm">No groups yet. <Link to="/groups" className="text-blue-600">Create one</Link></p>
          ) : groups.map(g => (
            <Link key={g._id} to={`/groups/${g._id}`} className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:text-blue-600">
              <span className="text-xl">👥</span>
              <div>
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-gray-400 text-xs">{g.members?.length} members</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Doubts Feed */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Doubt Feed <span className="text-red-500">🔴</span></h2>
        </div>
        {doubts.length === 0 ? (
          <p className="text-gray-400 text-sm">No doubts from your network yet.</p>
        ) : doubts.map(d => (
          <div key={d._id} className="py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{d.postedByUsername}</span>
              {!d.resolved && <span className="w-2 h-2 bg-red-500 rounded-full" />}
              {d.resolved && <span className="text-green-500 text-xs">✅ Resolved</span>}
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{d.topic}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
