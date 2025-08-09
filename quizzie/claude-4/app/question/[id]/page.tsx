'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

interface ActivationData {
  activation: string;
  question: string;
  isActive: boolean;
  showResults: boolean;
}

interface QuestionData {
  question: string;
  text: string;
  quiz: string;
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

export default function QuestionPage() {
  const params = useParams();
  const activationId = params.id as string;

  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<VoteCount[]>([]);
  const [userVote, setUserVote] = useState<string>('');
  const [userId] = useState(() => `user-${Math.random().toString(36).substr(2, 9)}`);
  const [qrCode, setQrCode] = useState<string>('');
  const [shareBase, setShareBase] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivation();
    setShareBase(window.location.origin);
  }, [activationId]);

  useEffect(() => {
    if (shareBase) {
      generateQR();
    }
  }, [shareBase]);

  const loadActivation = async () => {
    try {
      const response = await fetch(`/api/activations/${activationId}`);
      const data = await response.json();
      
      setActivation(data.activation[0]);
      setQuestion(data.question[0]);
      setOptions(data.options || []);
      setVotes(data.votes || []);
      
      // Check if user has already voted
      const userVoteResponse = await fetch(`/api/activations/${activationId}/vote?user=${userId}`);
      if (userVoteResponse.ok) {
        const userVoteData = await userVoteResponse.json();
        if (userVoteData.vote && userVoteData.vote.length > 0) {
          setUserVote(userVoteData.vote[0].option);
        }
      }
    } catch (err) {
      setError('Failed to load question');
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async () => {
    try {
      const url = `${shareBase}/question/${activationId}`;
      const qr = await QRCode.toDataURL(url);
      setQrCode(qr);
    } catch (err) {
      console.error('Failed to generate QR code');
    }
  };

  const vote = async (optionId: string) => {
    if (!activation?.isActive) return;

    try {
      const response = await fetch(`/api/activations/${activationId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userId,
          option: optionId
        })
      });

      if (response.ok) {
        setUserVote(optionId);
        pollVotes(); // Refresh vote counts
      } else {
        setError('Failed to record vote');
      }
    } catch (err) {
      setError('Failed to record vote');
    }
  };

  const pollVotes = async () => {
    try {
      const response = await fetch(`/api/activations/${activationId}`);
      const data = await response.json();
      setVotes(data.votes || []);
      setActivation(data.activation[0]);
    } catch (err) {
      // Polling failure is not critical
    }
  };

  const getVoteCount = (optionId: string) => {
    const voteData = votes.find(v => v.option === optionId);
    return voteData ? `${voteData.count}/${voteData.total}` : '0/0';
  };

  // Auto-poll for vote updates
  useEffect(() => {
    const interval = setInterval(pollVotes, 2000);
    return () => clearInterval(interval);
  }, [activationId]);

  if (loading) {
    return <div className="loading">Loading question...</div>;
  }

  if (!activation || !question) {
    return <div className="error">Question not found</div>;
  }

  const shareUrl = `${shareBase}/question/${activationId}`;

  return (
    <div className="container">
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

      <div className="share-panel">
        <div className="row">
          <label>Share base:</label>
          <input
            type="text"
            value={shareBase}
            onChange={(e) => setShareBase(e.target.value)}
            style={{ width: '200px', fontSize: '12px' }}
          />
        </div>
        <div className="hint">Share URL: {shareUrl}</div>
        {qrCode && <img src={qrCode} alt="QR Code" className="qr" />}
      </div>

      <div className="question">
        <div className="text">{question.text}</div>
        
        {!activation.isActive && (
          <div className="muted">Voting is not currently active for this question.</div>
        )}

        <div className="options">
          {options.map((option, index) => (
            <div 
              key={option.option} 
              className={`option-row ${userVote === option.option ? 'selected' : ''}`}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              <div 
                className="circle"
                onClick={() => vote(option.option)}
                style={{ 
                  cursor: activation.isActive ? 'pointer' : 'not-allowed',
                  opacity: activation.isActive ? 1 : 0.5 
                }}
              />
              <div className="option-label">{option.label}</div>
              {activation.showResults && (
                <div className="vote-count">{getVoteCount(option.option)}</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ clear: 'both', marginTop: '16px' }}>
          <button className="btn secondary" onClick={pollVotes}>
            🔄 Refresh Votes
          </button>
        </div>
      </div>
    </div>
  );
}
