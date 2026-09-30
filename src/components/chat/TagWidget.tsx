'use client';

import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { addTag, removeTag } from '@/store/slices/chatSlice';
import { Tag, X, Plus } from 'lucide-react';

export const TagWidget: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentConversation } = useAppSelector((state) => state.chat);
  const [isOpen, setIsOpen] = useState(false);
  const [newTag, setNewTag] = useState('');

  if (!currentConversation) return null;

  const handleAddTag = (tag: string) => {
    if (tag.trim()) {
      dispatch(addTag({ conversationId: currentConversation.id, tag: tag.trim() }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    dispatch(removeTag({ conversationId: currentConversation.id, tag }));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg transition-colors text-gray-400 hover:bg-gray-800/50 hover:text-white"
        title="Manage conversation tags"
      >
        <Tag className="h-4 w-4" />
        <span className="hidden sm:inline">Tags</span>
        {currentConversation.tags && currentConversation.tags.length > 0 && (
          <span className="text-xs bg-purple-600/30 text-purple-300 rounded-full px-2">
            {currentConversation.tags.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 space-y-2 z-50">
          {/* Existing Tags */}
          <div>
            <p className="text-xs font-medium text-gray-400 mb-2">Tags</p>
            {currentConversation.tags && currentConversation.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-2">
                {currentConversation.tags.map(tag => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/20 border border-purple-500/30 rounded text-xs text-purple-300"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-purple-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mb-2">No tags yet</p>
            )}
          </div>

          {/* Add New Tag */}
          <div className="border-t border-gray-700 pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="New tag..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag(newTag);
                  }
                }}
              />
              <button
                onClick={() => handleAddTag(newTag)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 text-xs text-gray-400 hover:text-white transition-colors py-1 border-t border-gray-700"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
