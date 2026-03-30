'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { sendMessage, clearMessages, updateMessage, saveConversationLocally } from '@/store/slices/chatSlice';
import AgentMessage from '@/components/chat/AgentMessage';
import UserMessage from '@/components/chat/UserMessage';
import { 
  Send, 
  Mic, 
  Square, 
  Zap, 
  DollarSign, 
  Bitcoin, 
  Building2, 
  Sun,
  CheckCircle,
  Clock,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

// Speech Recognition types
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const ChatEngine: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { messages, isLoading: isChatLoading, isTyping, currentConversation } = useAppSelector((state) => state.chat);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showTools, setShowTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [speechResult, setSpeechResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      dispatch(saveConversationLocally(currentConversation));
    }
  }, [dispatch, currentConversation, messages.length]);

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
        };

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setSpeechResult(finalTranscript);
            setInputValue(finalTranscript);
            if (recognitionRef.current) {
              recognitionRef.current.stop();
            }
          } else {
            setSpeechResult(interimTranscript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          setIsRecording(false);
          
          let errorMessage = 'Speech recognition failed. ';
          switch (event.error) {
            case 'no-speech': errorMessage += 'No speech was detected.'; break;
            case 'audio-capture': errorMessage += 'No microphone was found.'; break;
            case 'not-allowed': errorMessage += 'Microphone access denied.'; break;
            case 'network': errorMessage += 'Network error occurred.'; break;
            default: errorMessage += 'Please try again.';
          }
          toast.error(errorMessage);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
          setIsRecording(false);
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            setRecordingTime(0);
          }
        };
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isChatLoading || isTyping) return;

    const message = inputValue.trim();
    setInputValue('');

    try {
      const queryWithTool = selectedTool 
        ? `[Using ${selectedTool} tool] ${message}`
        : message;
      
      await dispatch(sendMessage(queryWithTool)).unwrap();
    } catch (error: any) {
      toast.error(error || 'Failed to send message');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    dispatch(updateMessage({ id: messageId, updates: { content: newContent } }));
    toast.success('Message updated');
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    } else {
      if (!recognitionRef.current) {
        toast.error('Speech recognition is not supported in this browser');
        return;
      }
      setSpeechResult('');
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      recognitionRef.current.start();
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const agentTools = [
    { name: 'Soroswap', description: 'Stellar DEX for token swaps', icon: Zap },
    { name: 'Blend', description: 'Lending and borrowing protocol', icon: DollarSign },
    { name: 'Aquarius', description: 'Liquidity pool management', icon: Bitcoin },
    { name: 'Phoenix', description: 'Advanced DeFi operations', icon: Building2 }
  ];

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(selectedTool === toolName ? null : toolName);
  };

  const renderInput = (isSticky: boolean = false) => (
    <div className={`w-full ${isSticky ? 'max-w-4xl mx-auto px-4 py-6' : 'max-w-3xl mb-8'}`}>
      <div className="relative bg-[#1A1A2E] rounded-2xl p-6 border border-gray-800/50 shadow-xl">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={isRecording ? "Listening..." : "Ask ChenPilot..."}
          disabled={isChatLoading || isTyping}
          className="w-full bg-transparent border-none text-white placeholder:text-gray-500 focus:outline-none text-lg mb-4"
        />
        
        {isRecording && (
          <div className="absolute right-6 top-6 flex items-center space-x-2 text-red-400">
            <div className="flex space-x-1">
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse"></div>
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span className="text-xs font-mono">{formatRecordingTime(recordingTime)}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                selectedTool 
                  ? 'text-purple-300 bg-purple-600/20 border border-purple-500/30' 
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
              }`}
            >
              <span className="text-lg">+</span>
              <span>Tools</span>
              {selectedTool && (
                <span className="text-xs bg-purple-500/30 px-2 py-0.5 rounded-full ml-1">
                  {selectedTool}
                </span>
              )}
            </button>
          </div>
          
          <button
            type="button"
            onClick={() => inputValue.trim() ? handleSendMessage() : toggleVoiceRecording()}
            disabled={isChatLoading || isTyping}
            className={`p-3 rounded-lg transition-colors ${
              isRecording 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : inputValue.trim() 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            {isRecording ? (
              <Square className="h-6 w-6" />
            ) : inputValue.trim() ? (
              <Send className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>
        </div>
        
        {showTools && (
          <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-20">
            <div className="py-1">
              {agentTools.map((tool, index) => {
                const IconComponent = tool.icon;
                const isSelected = selectedTool === tool.name;
                return (
                  <button
                    key={index}
                    onClick={() => handleToolSelect(tool.name)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-800 transition-colors text-left ${
                      isSelected ? 'bg-purple-600/10 border-l-2 border-purple-500' : ''
                    }`}
                  >
                    <div className={`${isSelected ? 'text-purple-400' : 'text-gray-400'}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                        {tool.name}
                      </div>
                      <div className="text-xs text-gray-500">{tool.description}</div>
                    </div>
                    {isSelected && <CheckCircle className="h-4 w-4 text-purple-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-[#0F0F23] text-white overflow-hidden relative">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <Sun className="h-8 w-8 text-orange-400 mr-3" />
                <h2 className="text-2xl font-light text-white">
                  Happy {new Date().toLocaleDateString('en-US', { weekday: 'long' })}, {user?.name || 'User'}
                </h2>
              </div>
              <p className="text-lg text-gray-400">What can we do today?</p>
            </div>
            {renderInput(false)}
            
            <div className="w-full max-w-2xl">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "Check wallet balance",
                  "Recent transactions",
                  "Deploy Stellar account",
                  "Create contact",
                  "Swap USDC to XLM",
                  "Bitcoin price"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(question)}
                    className="text-left px-3 py-2 bg-transparent border border-gray-700/50 rounded-lg hover:border-gray-600 transition-colors text-gray-400 hover:text-white"
                  >
                    <span className="text-xs font-medium">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'user' ? (
                  <UserMessage 
                    message={message} 
                    onCopy={copyToClipboard}
                    onEdit={handleEditMessage}
                  />
                ) : (
                  <div className="max-w-2xl w-full">
                    <AgentMessage message={message} onCopy={copyToClipboard} />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-800 rounded-2xl px-6 py-4 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-sm text-gray-400">ChenPilot is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {messages.length > 0 && (
        <div className="relative z-10 border-t border-gray-800/50 bg-[#0F0F23]/80 backdrop-blur-xl">
          {renderInput(true)}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          0% { transform: translateY(10px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ChatEngine;
