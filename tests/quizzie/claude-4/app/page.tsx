'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Quiz {
  quiz: string;
  title: string;
}

export default function HomePage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await fetch('/api/quizzes?owner=demo-user');
      const data = await response.json();
      setQuizzes(data.quizzes || []);
    } catch (err) {
      setError('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const createQuiz = async () => {
    if (!newQuizTitle.trim()) return;

    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'demo-user',
          title: newQuizTitle.trim()
        })
      });

      if (response.ok) {
        setNewQuizTitle('');
        loadQuizzes();
      } else {
        setError('Failed to create quiz');
      }
    } catch (err) {
      setError('Failed to create quiz');
    }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadQuizzes();
      } else {
        setError('Failed to delete quiz');
      }
    } catch (err) {
      setError('Failed to delete quiz');
    }
  };

  if (loading) {
    return <div className="loading">Loading quizzes...</div>;
  }

  return (
    <div className="container">
      <h1>My Quizzes</h1>

      {error && (
        <div className="error">
          {error}
          <button 
            onClick={() => setError('')}
            style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div className="input-group">
        <input
          type="text"
          placeholder="Enter quiz name..."
          value={newQuizTitle}
          onChange={(e) => setNewQuizTitle(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && createQuiz()}
        />
        <button 
          className="btn" 
          onClick={createQuiz}
          disabled={!newQuizTitle.trim()}
        >
          + Add Quiz
        </button>
      </div>

      {quizzes.length === 0 ? (
        <div className="empty-state">
          <p>No quizzes yet. Create your first quiz above!</p>
        </div>
      ) : (
        <div>
          {quizzes.map((quiz) => (
            <div key={quiz.quiz} className="quiz-row">
              <Link href={`/quiz/${quiz.quiz}`} className="quiz-name">
                {quiz.title}
              </Link>
              <span 
                className="trash"
                onClick={() => deleteQuiz(quiz.quiz)}
                title="Delete quiz"
              >
                🗑️
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
