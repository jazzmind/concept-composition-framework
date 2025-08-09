'use client';
import { useEffect, useState } from 'react';

interface Quiz { quiz: string; title: string }

export default function HomePage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/quizzes');
    const data = await res.json();
    setQuizzes(data.quizzes || []);
    setLoading(false);
  };

  const create = async () => {
    if (!title) return;
    setLoading(true);
    await fetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    setTitle('');
    await load();
  };

  useEffect(() => { load(); }, []);

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'Inter, system-ui, Arial' }}>
      <h1>Quizzie (gpt5)</h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <input placeholder="New quiz title" value={title} onChange={e => setTitle(e.target.value)} />
        <button onClick={create} disabled={!title || loading}>Add</button>
      </div>
      <div style={{ marginTop: 16 }}>
        {loading ? 'Loading…' : quizzes.length === 0 ? 'No quizzes yet' : (
          <ul>
            {quizzes.map(q => (
              <li key={q.quiz}>{q.title}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}


