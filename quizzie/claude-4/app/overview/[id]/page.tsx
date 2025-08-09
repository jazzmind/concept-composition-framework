'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Quiz {
  quiz: string;
  title: string;
  owner: string;
}

interface Question {
  question: string;
  text: string;
}

interface Option {
  option: string;
  label: string;
}

interface VoteCount {
  option: string;
  count: number;
  total: number;
}

interface Activation {
  activation: string;
  isActive: boolean;
  showResults: boolean;
}

export default function OverviewPage() {
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionOptions, setQuestionOptions] = useState<Record<string, Option[]>>({});
  const [questionVotes, setQuestionVotes] = useState<Record<string, VoteCount[]>>({});
  const [activations, setActivations] = useState<Record<string, Activation>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuiz();
  }, [quizId]);

  const loadQuiz = async () => {
    try {
      const response = await fetch(`/api/quizzes/${quizId}`);
      const data = await response.json();
      
      setQuiz(data.quiz[0]);
      setQuestions(data.questions || []);
      
      // Load options and votes for each question
      for (const question of data.questions || []) {
        await loadQuestionData(question.question);
      }
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestionData = async (questionId: string) => {
    try {
      // Load options
      const optionsResponse = await fetch(`/api/questions/${questionId}/options`);
      const optionsData = await optionsResponse.json();
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: optionsData.options || []
      }));

      // Load activations
      const activationsResponse = await fetch(`/api/questions/${questionId}/activations`);
      const activationsData = await activationsResponse.json();
      if (activationsData.activations && activationsData.activations.length > 0) {
        const active = activationsData.activations.find((a: Activation) => a.isActive);
        if (active) {
          setActivations(prev => ({
            ...prev,
            [questionId]: active
          }));

          // Load votes for active activation
          const votesResponse = await fetch(`/api/activations/${active.activation}/votes`);
          const votesData = await votesResponse.json();
          setQuestionVotes(prev => ({
            ...prev,
            [questionId]: votesData.votes || []
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load question data for', questionId);
    }
  };

  const pollAllVotes = async () => {
    for (const question of questions) {
      const activation = activations[question.question];
      if (activation) {
        try {
          const response = await fetch(`/api/activations/${activation.activation}/votes`);
          const data = await response.json();
          setQuestionVotes(prev => ({
            ...prev,
            [question.question]: data.votes || []
          }));
        } catch (err) {
          // Polling failure is not critical
        }
      }
    }
  };

  const getVoteCount = (questionId: string, optionId: string) => {
    const votes = questionVotes[questionId] || [];
    const voteData = votes.find(v => v.option === optionId);
    return voteData ? `${voteData.count}/${voteData.total}` : '0/0';
  };

  // Auto-poll for vote updates
  useEffect(() => {
    const interval = setInterval(pollAllVotes, 3000);
    return () => clearInterval(interval);
  }, [questions, activations]);

  if (loading) {
    return <div className="loading">Loading overview...</div>;
  }

  if (!quiz) {
    return <div className="error">Quiz not found</div>;
  }

  return (
    <div className="container">
      <div className="navigation">
        <h1>{quiz.title} - Overview</h1>
        <div className="nav-buttons">
          <button className="btn secondary" onClick={pollAllVotes}>
            🔄 Refresh All
          </button>
          <Link href={`/quiz/${quizId}`} className="btn secondary">
            ← Back to Quiz
          </Link>
        </div>
      </div>

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

      {questions.length === 0 ? (
        <div className="empty-state">
          <p>No questions in this quiz yet.</p>
        </div>
      ) : (
        <div>
          {questions.map((question) => {
            const options = questionOptions[question.question] || [];
            const activation = activations[question.question];
            const isActive = activation?.isActive;

            return (
              <div key={question.question} className="question">
                <div className="text">
                  {question.text}
                  {isActive && <span className="muted"> (ACTIVE)</span>}
                  {!isActive && <span className="muted"> (inactive)</span>}
                </div>

                <div className="options">
                  {options.map((option, index) => (
                    <div key={option.option} className="option-row">
                      <span>{String.fromCharCode(65 + index)}</span>
                      <div className="circle" style={{ opacity: 0.5 }}></div>
                      <div className="option-label">{option.label}</div>
                      <div className="vote-count">
                        {getVoteCount(question.question, option.option)}
                      </div>
                    </div>
                  ))}
                </div>

                {isActive && activation && (
                  <div style={{ marginTop: '8px' }}>
                    <Link 
                      href={`/question/${activation.activation}`} 
                      target="_blank"
                      className="btn secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Open Live View
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
