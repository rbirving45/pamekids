import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTouch } from '../../contexts/TouchContext';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = ''
}) => {
  const { setModalOpen } = useTouch();

  // Update TouchContext when modal opens/closes
  useEffect(() => {
    setModalOpen(isOpen);
    return () => setModalOpen(false);
  }, [isOpen, setModalOpen]);

  if (!isOpen) return null;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-modal-backdrop flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => {
        e.stopPropagation();
        // Only prevent default on the backdrop, not on the modal content
        if (!(e.target as Element).closest('.z-modal-container')) {
          e.preventDefault();
        }
      }}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className={`relative w-full max-w-md p-6 bg-white rounded-lg shadow-xl max-h-[90vh] overflow-y-auto z-modal-container ${className}`}
      >
        {/* Close button */}
        <button
          className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 z-modal-close"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6 pr-8">{title}</h2>

        {/* Modal content */}
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;