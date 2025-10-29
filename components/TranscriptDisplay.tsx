
import React, { useRef, useEffect } from 'react';
import type { TranscriptEntry } from '../types';

interface TranscriptDisplayProps {
  transcript: TranscriptEntry[];
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ transcript }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="bg-gray-900/40 p-4 rounded-lg h-80 flex flex-col">
      <h3 className="text-lg font-semibold mb-2 text-cyan-300 sticky top-0 bg-gray-900/40 py-2">Live Transcript</h3>
      <div className="overflow-y-auto flex-grow pr-2 space-y-4">
        {transcript.map((entry, index) => (
          <div
            key={index}
            className={`flex flex-col ${entry.speaker === 'AI Agent' ? 'items-start' : 'items-end'}`}
          >
            <div
              className={`p-3 rounded-xl max-w-xl ${
                entry.speaker === 'AI Agent'
                  ? 'bg-cyan-900/50 text-cyan-100 rounded-bl-none'
                  : 'bg-indigo-900/50 text-indigo-100 rounded-br-none'
              }`}
            >
              <p className="font-bold text-sm mb-1">{entry.speaker}</p>
              <p className="leading-relaxed">{entry.text}</p>
            </div>
          </div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

export default TranscriptDisplay;
