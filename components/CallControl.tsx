import React, { useState } from 'react';
import { CallStatus } from '../types';
import { PhoneIcon, PhoneXMarkIcon, EllipsisHorizontalIcon } from './icons';

interface CallControlProps {
  status: CallStatus;
  onStart: () => void;
  onEnd: () => void;
}

const CallControl: React.FC<CallControlProps> = ({ status, onStart, onEnd }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  // Simple validation: at least 10 digits, allowing for formatting characters
  const isPhoneNumberValid = (phoneNumber.match(/\d/g) || []).length >= 10;

  const isCalling = status === CallStatus.CONNECTING || status === CallStatus.ACTIVE || status === CallStatus.DIALING || status === CallStatus.RINGING;
  const isIdle = status === CallStatus.IDLE || status === CallStatus.ENDED;

  const getStatusText = () => {
    switch (status) {
      case CallStatus.IDLE:
        return "Ready to Call";
      case CallStatus.DIALING:
        return `Dialing ${phoneNumber}...`;
      case CallStatus.RINGING:
        return `Ringing ${phoneNumber}...`;
      case CallStatus.CONNECTING:
        return `Connecting...`;
      case CallStatus.ACTIVE:
        return `In Call with ${phoneNumber}`;
      case CallStatus.ENDING:
        return "Ending Call & Summarizing...";
      case CallStatus.ENDED:
        return "Call Ended";
      default:
        return "Unknown Status";
    }
  };

  const getStatusColor = () => {
    switch (status) {
        case CallStatus.IDLE: return "text-gray-400";
        case CallStatus.DIALING: return "text-yellow-400";
        case CallStatus.RINGING: return "text-yellow-400";
        case CallStatus.CONNECTING: return "text-yellow-400";
        case CallStatus.ACTIVE: return "text-green-400";
        case CallStatus.ENDING: return "text-orange-400";
        case CallStatus.ENDED: return "text-cyan-400";
        default: return "text-gray-400";
    }
  };

  const handleStartCall = () => {
      if (isPhoneNumberValid) {
          onStart();
      }
  };

  const buttonAction = isCalling ? onEnd : handleStartCall;
  const buttonText = isCalling ? 'End Call' : 'Start Call';
  const buttonIcon = isCalling ? <PhoneXMarkIcon /> : <PhoneIcon />;
  const buttonClass = isCalling ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

  const isStartButtonDisabled = isIdle && !isPhoneNumberValid;
  const isDisabled = (status === CallStatus.CONNECTING || status === CallStatus.ENDING) || isStartButtonDisabled;

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900/60 rounded-xl">
      {isIdle && (
        <div className="w-full">
          <label htmlFor="phone-number" className="block text-sm font-medium text-gray-400 mb-2">
            Phone Number to Call
          </label>
          <input
            id="phone-number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition"
            aria-label="Phone number to call"
          />
        </div>
      )}
      <div className="flex flex-col sm:flex-row items-center justify-between">
        <div className={`flex items-center font-semibold text-lg ${getStatusColor()}`}>
            {(status === CallStatus.CONNECTING || status === CallStatus.DIALING || status === CallStatus.RINGING) && <EllipsisHorizontalIcon className="animate-pulse" />}
            {status === CallStatus.ACTIVE && <span className="w-4 h-4 mr-2 bg-green-500 rounded-full animate-pulse"></span>}
            <span>{getStatusText()}</span>
        </div>
        <button
          onClick={buttonAction}
          disabled={isDisabled}
          className={`mt-4 sm:mt-0 flex items-center justify-center gap-2 px-6 py-3 font-bold text-white rounded-lg transition-all duration-200 ease-in-out shadow-lg focus:outline-none focus:ring-4 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass} ${isCalling ? 'focus:ring-red-400' : 'focus:ring-green-400'} ${!isDisabled ? 'transform hover:scale-105 hover:shadow-xl active:scale-95' : ''}`}
        >
          {buttonIcon}
          <span>{buttonText}</span>
        </button>
      </div>
    </div>
  );
};

export default CallControl;