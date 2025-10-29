
import React from 'react';
import type { TranscriptEntry } from '../types';
import { DocumentTextIcon, SparklesIcon } from './icons';

interface ReportDisplayProps {
  summary: string;
  transcript: TranscriptEntry[];
  isLoadingSummary: boolean;
}

const ReportDisplay: React.FC<ReportDisplayProps> = ({ summary, transcript, isLoadingSummary }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900/40 p-5 rounded-lg">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-cyan-300">
            <SparklesIcon />
            Call Summary
        </h3>
        {isLoadingSummary ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
          </div>
        ) : (
          <p className="text-gray-300 whitespace-pre-wrap">{summary || 'No summary generated.'}</p>
        )}
      </div>

      <div className="bg-gray-900/40 p-5 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-cyan-300">
            <DocumentTextIcon />
            Full Transcript
        </h3>
        <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
            {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === 'AI Agent' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`p-3 rounded-lg max-w-lg ${entry.speaker === 'AI Agent' ? 'bg-cyan-900/50 text-cyan-100' : 'bg-indigo-900/50 text-indigo-100'}`}>
                        <p className="font-bold text-sm mb-1">{entry.speaker}</p>
                        <p>{entry.text}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;
