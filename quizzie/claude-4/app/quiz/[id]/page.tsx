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

interface Activation {
  activation: string;
  isActive: boolean;
  showResults: boolean;
}

export default function QuizPage() {
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionOptions, setQuestionOptions] = useState<Record<string, Option[]>>({});
  const [activations, setActivations] = useState<Record<string, Activation>>({});
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptionText, setNewOptionText] = useState<Record<string, string>>({});
  const [editingQuestion, setEditingQuestion] = useState<string>('');
  const [editingOption, setEditingOption] = useState<string>('');
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
      
      // Load options for each question
      for (const question of data.questions || []) {
        await loadOptions(question.question);
        await loadActivations(question.question);
      }
    } catch (err) {
      setError('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/options`);
      const data = await response.json();
      setQuestionOptions(prev => ({
        ...prev,
        [questionId]: data.options || []
      }));
    } catch (err) {
      console.error('Failed to load options for question', questionId);
    }
  };

  const loadActivations = async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/activations`);
      const data = await response.json();
      if (data.activations && data.activations.length > 0) {
        const active = data.activations.find((a: Activation) => a.isActive);
        if (active) {
          setActivations(prev => ({
            ...prev,
            [questionId]: active
          }));
        }
      }
    } catch (err) {
      // No activations is normal
    }
  };

  const addQuestion = async () => {
    if (!newQuestionText.trim()) return;

    try {
      const response = await fetch(`/api/quizzes/${quizId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newQuestionText.trim()
        })
      });

      if (response.ok) {
        setNewQuestionText('');
        loadQuiz();
      } else {
        setError('Failed to add question');
      }
    } catch (err) {
      setError('Failed to add question');
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadQuiz();
      } else {
        setError('Failed to delete question');
      }
    } catch (err) {
      setError('Failed to delete question');
    }
  };

  const updateQuestion = async (questionId: string, text: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (response.ok) {
        setEditingQuestion('');
        loadQuiz();
      } else {
        setError('Failed to update question');
      }
    } catch (err) {
      setError('Failed to update question');
    }
  };

  const addOption = async (questionId: string) => {
    const text = newOptionText[questionId];
    if (!text?.trim()) return;

    try {
      const response = await fetch(`/api/questions/${questionId}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: text.trim()
        })
      });

      if (response.ok) {
        setNewOptionText(prev => ({ ...prev, [questionId]: '' }));
        loadOptions(questionId);
      } else {
        setError('Failed to add option');
      }
    } catch (err) {
      setError('Failed to add option');
    }
  };

  const deleteOption = async (optionId: string, questionId: string) => {
    try {
      const response = await fetch(`/api/options/${optionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadOptions(questionId);
      } else {
        setError('Failed to delete option');
      }
    } catch (err) {
      setError('Failed to delete option');
    }
  };

  const updateOption = async (optionId: string, label: string, questionId: string) => {
    try {
      const response = await fetch(`/api/options/${optionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      });

      if (response.ok) {
        setEditingOption('');
        loadOptions(questionId);
      } else {
        setError('Failed to update option');
      }
    } catch (err) {
      setError('Failed to update option');
    }
  };

  const activateQuestion = async (questionId: string) => {
    try {
      const response = await fetch(`/api/questions/${questionId}/activate`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        // Open the activation page in a new tab
        window.open(`/question/${data.activation}`, '_blank');
        loadActivations(questionId);
      } else {
        setError('Failed to activate question');
      }
    } catch (err) {
      setError('Failed to activate question');
    }
  };

  const deactivateQuestion = async (questionId: string) => {
    const activation = activations[questionId];
    if (!activation) return;

    try {
      const response = await fetch(`/api/activations/${activation.activation}/deactivate`, {
        method: 'POST'
      });

      if (response.ok) {
        setActivations(prev => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
      } else {
        setError('Failed to deactivate question');
      }
    } catch (err) {
      setError('Failed to deactivate question');
    }
  };

  const showResults = async (questionId: string) => {
    const activation = activations[questionId];
    if (!activation) return;

    try {
      const response = await fetch(`/api/activations/${activation.activation}/show`, {
        method: 'POST'
      });

      if (response.ok) {
        setActivations(prev => ({
          ...prev,
          [questionId]: { ...prev[questionId], showResults: true }
        }));
      } else {
        setError('Failed to show results');
      }
    } catch (err) {
      setError('Failed to show results');
    }
  };

  const hideResults = async (questionId: string) => {
    const activation = activations[questionId];
    if (!activation) return;

    try {
      const response = await fetch(`/api/activations/${activation.activation}/hide`, {
        method: 'POST'
      });

      if (response.ok) {
        setActivations(prev => ({
          ...prev,
          [questionId]: { ...prev[questionId], showResults: false }
        }));
      } else {
        setError('Failed to hide results');
      }
    } catch (err) {
      setError('Failed to hide results');
    }
  };

  const openOverview = () => {
    window.open(`/overview/${quizId}`, '_blank');
  };

  if (loading) {
    return <div className="loading">Loading quiz...</div>;
  }

  if (!quiz) {
    return <div className="error">Quiz not found</div>;
  }

  return (
    <div className="container">
      <div className="navigation">
        <h1>{quiz.title}</h1>
        <div className="nav-buttons">
          <button className="btn secondary" onClick={openOverview}>
            Overview
          </button>
          <Link href="/" className="btn secondary">
            ← Back to Quizzes
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

      <div className="input-group">
        <input
          type="text"
          placeholder="Enter question text..."
          value={newQuestionText}
          onChange={(e) => setNewQuestionText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
        />
        <button 
          className="btn" 
          onClick={addQuestion}
          disabled={!newQuestionText.trim()}
        >
          + Add Question
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="empty-state">
          <p>No questions yet. Add your first question above!</p>
        </div>
      ) : (
        <div>
          {questions.map((question) => {
            const options = questionOptions[question.question] || [];
            const activation = activations[question.question];
            const isActive = activation?.isActive;
            const showingResults = activation?.showResults;

            return (
              <div key={question.question} className="question">
                <div className="question-row">
                  {editingQuestion === question.question ? (
                    <input
                      type="text"
                      defaultValue={question.text}
                      onBlur={(e) => updateQuestion(question.question, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateQuestion(question.question, e.currentTarget.value);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text"
                      onClick={() => setEditingQuestion(question.question)}
                      style={{ cursor: 'pointer' }}
                    >
                      {question.text}
                    </div>
                  )}
                  <span 
                    className="trash"
                    onClick={() => deleteQuestion(question.question)}
                    title="Delete question"
                  >
                    🗑️
                  </span>
                </div>

                <div className="controls">
                  {!isActive ? (
                    <button 
                      className="btn" 
                      onClick={() => activateQuestion(question.question)}
                    >
                      Activate
                    </button>
                  ) : (
                    <>
                      <button 
                        className="btn danger" 
                        onClick={() => deactivateQuestion(question.question)}
                      >
                        Deactivate
                      </button>
                      {!showingResults ? (
                        <button 
                          className="btn secondary" 
                          onClick={() => showResults(question.question)}
                        >
                          Show Results
                        </button>
                      ) : (
                        <button 
                          className="btn secondary" 
                          onClick={() => hideResults(question.question)}
                        >
                          Hide Results
                        </button>
                      )}
                    </>
                  )}
                </div>

                <div className="options">
                  {options.map((option) => (
                    <div key={option.option} className="option-row">
                      <span>{String.fromCharCode(65 + options.indexOf(option))}</span>
                      <div className="circle"></div>
                      {editingOption === option.option ? (
                        <input
                          type="text"
                          defaultValue={option.label}
                          onBlur={(e) => updateOption(option.option, e.target.value, question.question)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateOption(option.option, e.currentTarget.value, question.question);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <div 
                          className="option-label"
                          onClick={() => setEditingOption(option.option)}
                          style={{ cursor: 'pointer' }}
                        >
                          {option.label}
                        </div>
                      )}
                      <span 
                        className="trash"
                        onClick={() => deleteOption(option.option, question.question)}
                        title="Delete option"
                      >
                        🗑️
                      </span>
                    </div>
                  ))}

                  <div className="input-group">
                    <input
                      type="text"
                      placeholder="Enter option text..."
                      value={newOptionText[question.question] || ''}
                      onChange={(e) => setNewOptionText(prev => ({
                        ...prev,
                        [question.question]: e.target.value
                      }))}
                      onKeyPress={(e) => e.key === 'Enter' && addOption(question.question)}
                    />
                    <button 
                      className="btn" 
                      onClick={() => addOption(question.question)}
                      disabled={!newOptionText[question.question]?.trim()}
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
