import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import socket from '../socket'

function Timer({ seconds, onEnd }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setLeft(l => { if (l <= 1) { clearInterval(t); onEnd(); return 0 } return l - 1 }), 1000)
    return () => clearInterval(t)
  }, [])
  const m = Math.floor(left / 60), s = left % 60
  return <span className={`font-mono text-xl font-bold ${left < 30 ? 'text-red-500' : 'text-green-600'}`}>{m}:{s.toString().padStart(2, '0')}</span>
}

const STARS = (n) => '⭐'.repeat(n) + '☆'.repeat(4 - n)

export default function BattleOfGroups() {
  const { user } = useAuth()
  const [battles, setBattles] = useState([])
  const [groups, setGroups] = useState([])
  const [view, setView] = useState('list')
  const [activeBattle, setActiveBattle] = useState(null)
  const [answers, setAnswers] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [discuss, setDiscuss] = useState({ text: '', type: 'general', questionIndex: -1 })
  const [createForm, setCreateForm] = useState({
    topic: '', level: 'Beginner', duration: 300,
    questions: [{ question: '', options: ['', '', '', ''], answer: '' }]
  })

  const activeBattleRef = useRef(activeBattle)
  useEffect(() => { activeBattleRef.current = activeBattle }, [activeBattle])

  useEffect(() => {
    fetchBattles()
    axios.get('/api/groups').then(r => setGroups(r.data)).catch(() => {})
    const handleUpdate = (data) => {
      fetchBattles()
      if (data.battleId && activeBattleRef.current && data.battleId === activeBattleRef.current._id) {
        fetchBattle(data.battleId)
      }
    }
    socket.on('battle:updated', handleUpdate)
    return () => socket.off('battle:updated', handleUpdate)
  }, [])

  const fetchBattles = async () => {
    try { const { data } = await axios.get('/api/battles'); setBattles(data) } catch (e) {}
  }
  const fetchBattle = async (id) => {
    try { const { data } = await axios.get(`/api/battles/${id}`); setActiveBattle(data) } catch (e) {}
  }

  const addQ = () => setCreateForm(f => ({ ...f, questions: [...f.questions, { question: '', options: ['', '', '', ''], answer: '' }] }))
  const updateQ = (i, field, val) => setCreateForm(f => { const qs = [...f.questions]; qs[i] = { ...qs[i], [field]: val }; return { ...f, questions: qs } })
  const updateOpt = (qi, oi, val) => setCreateForm(f => { const qs = [...f.questions]; qs[qi].options[oi] = val; return { ...f, questions: qs } })

  const createBattle = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/battles', createForm)
      setActiveBattle(data); setAnswers(new Array(data.questions.length).fill(''))
      setView('lobby'); fetchBattles(); socket.emit('battle:join', data._id)
    } catch (e) {}
  }

  const joinBattle = async (battle) => {
    if (!selectedGroup) return alert('Select a group first')
    const grp = groups.find(g => g._id === selectedGroup)
    try {
      const { data } = await axios.post(`/api/battles/${battle._id}/join`, { groupId: selectedGroup, groupName: grp?.name })
      setActiveBattle(data); setAnswers(new Array(data.questions.length).fill(''))
      setView(data.status === 'active' ? 'active' : 'lobby')
      socket.emit('battle:join', data._id)
    } catch (e) {}
  }

  const submitBattle = async () => {
    if (!selectedGroup) return
    const grp = groups.find(g => g._id === selectedGroup)
    try {
      const { data } = await axios.post(`/api/battles/${activeBattle._id}/submit`, { groupId: selectedGroup, groupName: grp?.name, answers })
      setActiveBattle(data); setView('results')
      socket.emit('battle:update', { battleId: data._id })
    } catch (e) {}
  }

  const postDiscuss = async () => {
    if (!discuss.text.trim()) return
    try {
      const { data } = await axios.post(`/api/battles/${activeBattle._id}/discuss`, discuss)
      setActiveBattle(data); setDiscuss(d => ({ ...d, text: '' }))
    } catch (e) {}
  }

  const upvote = async (idx) => {
    try { const { data } = await axios.post(`/api/battles/${activeBattle._id}/discuss/${idx}/upvote`); setActiveBattle(data) } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Battle of Groups ⚔️</h1>
        <div className="flex gap-2">
          {view !== 'list' && <button onClick={() => { setView('list'); fetchBattles() }} className="btn-secondary">← Back</button>}
          {view === 'list' && <button onClick={() => setView('create')} className="btn-primary">+ Create Battle</button>}
        </div>
      </div>

      {/* List */}
      {view === 'list' && (
        <div className="space-y-4">
          {groups.length > 0 && (
            <div className="card">
              <p className="text-sm font-medium mb-2">Your group for battles:</p>
              <select className="input max-w-xs" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                <option value="">Select group...</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>
          )}
          {battles.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-gray-500">No battles yet. Create one!</p>
            </div>
          ) : battles.map(b => (
            <div key={b._id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{b.topic}</p>
                  <p className="text-gray-400 text-xs">{b.level} · {b.questions?.length} questions · {b.groups?.length} groups</p>
                  <span className={`text-xs px-2 py-0.5 rounded-lg mt-1 inline-block ${b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {b.status !== 'completed' && (
                    <button onClick={() => joinBattle(b)} className="btn-primary text-xs">Join Battle</button>
                  )}
                  {b.status === 'completed' && (
                    <button onClick={() => { setActiveBattle(b); setView('results') }} className="btn-secondary text-xs">Results</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create */}
      {view === 'create' && (
        <div className="card">
          <h2 className="font-semibold mb-4">Create Battle</h2>
          <form onSubmit={createBattle} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <input className="input col-span-2" placeholder="Topic" value={createForm.topic} onChange={e => setCreateForm(f => ({ ...f, topic: e.target.value }))} required />
              <select className="input" value={createForm.level} onChange={e => setCreateForm(f => ({ ...f, level: e.target.value }))}>
                {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <input className="input w-40" type="number" placeholder="Duration (s)" value={createForm.duration} onChange={e => setCreateForm(f => ({ ...f, duration: +e.target.value }))} />
            {createForm.questions.map((q, qi) => (
              <div key={qi} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-3">
                <p className="font-medium text-sm">Q{qi + 1}</p>
                <input className="input" placeholder="Question" value={q.question} onChange={e => updateQ(qi, 'question', e.target.value)} required />
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((o, oi) => <input key={oi} className="input" placeholder={`Option ${oi + 1}`} value={o} onChange={e => updateOpt(qi, oi, e.target.value)} />)}
                </div>
                <input className="input" placeholder="Correct answer" value={q.answer} onChange={e => updateQ(qi, 'answer', e.target.value)} required />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={addQ} className="btn-secondary">+ Question</button>
              <button type="submit" className="btn-primary">Create Battle</button>
            </div>
          </form>
        </div>
      )}

      {/* Lobby */}
      {view === 'lobby' && activeBattle && (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">⏳</p>
          <h2 className="text-xl font-bold">{activeBattle.topic}</h2>
          <p className="text-gray-500 mt-2">Waiting for groups to join... ({activeBattle.groups?.length} joined)</p>
          <p className="text-sm text-gray-400 mt-1">Battle starts when 2+ groups join</p>
          {activeBattle.status === 'active' && (
            <button onClick={() => setView('active')} className="btn-primary mt-4">Start Battle!</button>
          )}
        </div>
      )}

      {/* Active Battle */}
      {view === 'active' && activeBattle && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{activeBattle.topic}</p>
              <p className="text-gray-400 text-sm">{activeBattle.level}</p>
            </div>
            <Timer seconds={activeBattle.duration} onEnd={submitBattle} />
          </div>
          {activeBattle.questions.map((q, qi) => (
            <div key={qi} className="card space-y-3">
              <p className="font-medium">Q{qi + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.filter(Boolean).map((opt, oi) => (
                  <button key={oi} onClick={() => setAnswers(a => { const n = [...a]; n[qi] = opt; return n })}
                    className={`p-3 rounded-xl text-sm text-left border-2 transition-all ${answers[qi] === opt ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button onClick={submitBattle} className="btn-primary w-full text-lg py-3">⚔️ Submit Battle</button>
        </div>
      )}

      {/* Results + Discussion */}
      {view === 'results' && activeBattle && (
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4">🏆 Leaderboard</h2>
            {activeBattle.results?.sort((a, b) => b.score - a.score).map((r, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${i === 0 ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200' : 'bg-gray-50 dark:bg-gray-700'}`}>
                <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                <div className="flex-1">
                  <p className="font-semibold">{r.groupName}</p>
                  <p className="text-sm text-gray-400">{STARS(r.stars || 0)}</p>
                </div>
                <span className="font-bold text-blue-600">{r.score}/{activeBattle.questions?.length}</span>
              </div>
            ))}
          </div>

          {/* Post-Battle Discussion */}
          <div className="card">
            <h2 className="font-bold mb-4">Post-Battle Discussion 💬</h2>
            <div className="flex gap-2 mb-4 flex-wrap">
              {['general', 'question', 'insight'].map(t => (
                <button key={t} onClick={() => setDiscuss(d => ({ ...d, type: t }))}
                  className={`px-3 py-1 rounded-lg text-sm ${discuss.type === t ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700'}`}>
                  {t === 'general' ? '💬 General' : t === 'question' ? '❓ Question-wise' : '💡 Insights'}
                </button>
              ))}
            </div>
            {discuss.type === 'question' && (
              <select className="input mb-3 max-w-xs" value={discuss.questionIndex} onChange={e => setDiscuss(d => ({ ...d, questionIndex: +e.target.value }))}>
                <option value={-1}>Select question...</option>
                {activeBattle.questions?.map((q, i) => <option key={i} value={i}>Q{i + 1}: {q.question.substring(0, 40)}</option>)}
              </select>
            )}
            <div className="flex gap-2 mb-4">
              <input className="input flex-1" placeholder="Share your thoughts..." value={discuss.text} onChange={e => setDiscuss(d => ({ ...d, text: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') postDiscuss() }} />
              <button onClick={postDiscuss} className="btn-primary">Post</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeBattle.discussion?.filter(d => discuss.type === 'general' ? d.type === 'general' : discuss.type === 'insight' ? d.type === 'insight' : d.type === 'question')
                .map((d, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-medium text-sm">{d.user}</span>
                        {d.questionIndex >= 0 && <span className="text-xs text-blue-600 ml-2">Q{d.questionIndex + 1}</span>}
                        <p className="text-sm mt-0.5">{d.text}</p>
                      </div>
                      <button onClick={() => upvote(i)} className="text-xs text-gray-400 hover:text-blue-600 shrink-0">👍 {d.upvotes}</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
