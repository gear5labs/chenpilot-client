'use client';

import React from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setRateLimited } from '@/store/slices/uiSlice';
import { AlertCircle, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const RateLimitBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const isRateLimited = useAppSelector((state) => state.ui.isRateLimited);

  const handleDismiss = () => {
    dispatch(setRateLimited(false));
  };

  return (
    <AnimatePresence>
      {isRateLimited && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="relative z-[100] w-full overflow-hidden"
        >
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 backdrop-blur-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <Clock size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">System Rate Limit Active</h3>
                  <p className="text-xs text-amber-200/70">
                    We've received too many requests from your IP. Please wait a moment before trying again.
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 p-1 rounded-lg hover:bg-amber-500/20 text-amber-500/60 hover:text-amber-500 transition-colors"
                aria-label="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RateLimitBanner;
