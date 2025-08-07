import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomModal({ isOpen, onClose, title, children, className = "" }: CustomModalProps) {
  const isClosingRef = useRef(false);

  // Handle escape key and body scroll (optimized)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosingRef.current) {
        isClosingRef.current = true;
        onClose();
        setTimeout(() => {
          isClosingRef.current = false;
        }, 100);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll only if not already set
      if (document.body.style.overflow !== 'hidden') {
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-50"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        // Disable all transitions that could cause movement
        transition: 'none',
        transform: 'none',
        animation: 'none'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isClosingRef.current) {
          isClosingRef.current = true;
          onClose();
          setTimeout(() => {
            isClosingRef.current = false;
          }, 100);
        }
      }}
    >
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] flex flex-col ${className}`}
        style={{
          // Force stable positioning - disable all transitions and transforms
          transition: 'none',
          transform: 'none',
          animation: 'none',
          position: 'relative',
          margin: '0 auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate pr-4">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if (!isClosingRef.current) {
                isClosingRef.current = true;
                onClose();
                setTimeout(() => {
                  isClosingRef.current = false;
                }, 100);
              }
            }}
            className="h-8 w-8 p-0 flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
