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
  return <span className={`font-mono text-lg ${left < 60 ? 'text-red-500' : 'text-green-600'}`}>{m}:{s.toString().padStart(2, '0')}</span>
}

export default function TakeTest() {
  const { user } = useAuth()
  const [tests, setTests] = useState([])
  const [view, setView] = useState('list') // list | create | active | results
  const [form, setForm] = useState({ title: '', duration: 600, questions: [{ question: '', options: ['', '', '', ''], answer: '', type: 'mcq' }] })
  const [activeTest, setActiveTest] = useState(null)
  const [answers, setAnswers] = useState([])
  const [joinCode, setJoinCode] = useState('')

  const activeTestRef = useRef(activeTest)
  useEffect(() => { activeTestRef.current = activeTest }, [activeTest])

  useEffect(() => {
    fetchTests()
    const handleUpdate = (data) => {
      fetchTests()
      if (data.test && activeTestRef.current && data.test._id === activeTestRef.current._id) {
        setActiveTest(data.test)
      }
    }
    socket.on('test:updated', handleUpdate)
    return () => socket.off('test:updated', handleUpdate)
  }, [])

  const fetchTests = async () => {
    try { const { data } = await axios.get('/api/tests'); setTests(data) } catch (e) {}
  }

  const addQuestion = () => setForm(f => ({ ...f, questions: [...f.questions, { question: '', options: ['', '', '', ''], answer: '', type: 'mcq' }] }))

  const updateQ = (i, field, val) => setForm(f => {
    const qs = [...f.questions]; qs[i] = { ...qs[i], [field]: val }; return { ...f, questions: qs }
  })
  const updateOpt = (qi, oi, val) => setForm(f => {
    const qs = [...f.questions]; qs[qi].options[oi] = val; return { ...f, questions: qs }
  })

  const createTest = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post('/api/tests', form)
      setActiveTest(data)
      setView('created') // show share screen, not active test
      socket.emit('test:join', data._id)
      fetchTests()
    } catch (e) {}
  }

  const joinTest = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.post(`/api/tests/${joinCode}/join`)
      setActiveTest(data); setAnswers(new Array(data.questions.length).fill(''))
      setView('active'); socket.emit('test:join', data._id)
    } catch (e) { alert(e.response?.data?.message || 'Test not found') }
  }

  const startTest = async (t) => {
    try {
      const { data } = await axios.post(`/api/tests/${t._id}/join`)
      setActiveTest(data); setAnswers(new Array(data.questions.length).fill(''))
      setView('active'); socket.emit('test:join', data._id)
    } catch (e) { alert(e.response?.data?.message || 'Unable to join test') }
  }

  const submitTest = async () => {
    try {
      const { data } = await axios.post(`/api/tests/${activeTest._id}/submit`, { answers })
      setActiveTest(data); setView('results')
      socket.emit('test:update', { testId: data._id, test: data })
    } catch (e) {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Take Test 🧪</h1>
        <div className="flex gap-2">
          {view !== 'list' && <button onClick={() => setView('list')} className="btn-secondary">← Back</button>}
          {view === 'list' && <button onClick={() => setView('create')} className="btn-primary">+ Create Test</button>}
        </div>
      </div>

      {/* List */}
      {view === 'list' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-3">Join a Test</h2>
            <form onSubmit={joinTest} className="flex gap-2">
              <input className="input flex-1" placeholder="Test ID..." value={joinCode} onChange={e => setJoinCode(e.target.value)} />
              <button type="submit" className="btn-primary">Join</button>
            </form>
          </div>
          {tests.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">🧪</p>
              <p className="text-gray-500">No tests yet. Create one!</p>
            </div>
          ) : tests.map(t => (
            <div key={t._id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-gray-400 text-xs">{t.questions?.length} questions · by {t.creatorName}</p>
                  <p className="text-xs mt-1">
                    <span className={`px-2 py-0.5 rounded-lg ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {t.status}
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <p className="text-xs text-gray-400 font-mono">{t._id.slice(-8)}</p>
                  {t.createdBy === user._id || t.creatorName === user.username ? (
                    <span className="text-xs text-gray-400 italic">You created this</span>
                  ) : t.status !== 'completed' ? (
                    <button onClick={() => startTest(t)}
                      className="btn-primary text-xs">Take Test</button>
                  ) : (
                    <button onClick={() => { setActiveTest(t); setView('results') }} className="btn-secondary text-xs">View Results</button>
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
          <h2 className="font-semibold mb-4">Create Test</h2>
          <form onSubmit={createTest} className="space-y-4">
            <div className="flex gap-3">
              <input className="input flex-1" placeholder="Test Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              <input className="input w-32" type="number" placeholder="Duration (s)" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} />
            </div>
            {form.questions.map((q, qi) => (
              <div key={qi} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 space-y-3">
                <p className="font-medium text-sm">Question {qi + 1}</p>
                <input className="input" placeholder="Question text" value={q.question} onChange={e => updateQ(qi, 'question', e.target.value)} required />
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <input key={oi} className="input" placeholder={`Option ${oi + 1}`} value={opt} onChange={e => updateOpt(qi, oi, e.target.value)} />
                  ))}
                </div>
                <input className="input" placeholder="Correct answer (exact text)" value={q.answer} onChange={e => updateQ(qi, 'answer', e.target.value)} required />
              </div>
            ))}
            <div className="flex gap-2">
              <button type="button" onClick={addQuestion} className="btn-secondary">+ Add Question</button>
              <button type="submit" className="btn-primary">Create & Start</button>
            </div>
          </form>
        </div>
      )}

      {/* Created - share screen */}
      {view === 'created' && activeTest && (
        <div className="card text-center py-10 space-y-4">
          <p className="text-4xl">🎉</p>
          <h2 className="text-xl font-bold">Test Created!</h2>
          <p className="text-gray-500 text-sm">Share this ID with your peers so they can join and attempt it.</p>
          <div className="flex items-center justify-center gap-3">
            <span className="font-mono text-lg bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-xl">{activeTest._id}</span>
            <button onClick={() => { navigator.clipboard.writeText(activeTest._id) }} className="btn-secondary text-sm">Copy</button>
          </div>
          <p className="text-xs text-gray-400">You cannot take your own test. Only your peers can attempt it.</p>
          <button onClick={() => setView('list')} className="btn-primary">Back to Tests</button>
        </div>
      )}

      {/* Active Test */}
      {view === 'active' && activeTest && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between">
            <p className="font-semibold">{activeTest.title}</p>
            <Timer seconds={activeTest.duration} onEnd={submitTest} />
          </div>
          {activeTest.questions.map((q, qi) => (
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
          <button onClick={submitTest} className="btn-primary w-full">Submit Test</button>
        </div>
      )}

      {/* Results */}
      {view === 'results' && activeTest && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Results: {activeTest.title}</h2>
            <div className="space-y-2">
              {activeTest.results?.sort((a, b) => b.score - a.score).map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${r.username === user.username ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'}`}>
                  <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium">{r.username} {r.username === user.username && '(You)'}</p>
                  </div>
                  <span className="font-bold text-blue-600">{r.score}/{activeTest.questions.length}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card space-y-3">
            <h3 className="font-semibold">Answer Review</h3>
            {activeTest.questions.map((q, qi) => {
              const myResult = activeTest.results?.find(r => r.username === user.username)
              const myAnswer = myResult?.answers?.[qi]
              const correct = myAnswer === q.answer
              return (
                <div key={qi} className={`p-3 rounded-xl ${correct ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                  <p className="font-medium text-sm">Q{qi + 1}. {q.question}</p>
                  <p className="text-sm mt-1">Your answer: <span className={correct ? 'text-green-600' : 'text-red-500'}>{myAnswer || 'Not answered'}</span></p>
                  {!correct && <p className="text-sm text-green-600">Correct: {q.answer}</p>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
