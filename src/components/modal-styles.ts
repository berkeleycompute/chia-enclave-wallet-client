// Shared modal styles for consistent design across all dialogs
export const sharedModalStyles = `
  /* Base Modal Styles - Dark Theme */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
    z-index: 1000;
  }

  /* Modal Content Base */
  .modal-content {
    background: #1a1a1a;
    border-radius: 16px;
    border: 1px solid #333;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    color: white;
    scrollbar-width: none;
    -ms-overflow-style: none;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .modal-content::-webkit-scrollbar {
    display: none;
  }

  /* Modal Header */
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #333;
    position: relative;
  }

  .modal-header h2,
  .modal-header h3 {
    margin: 0;
    color: white;
    font-size: 18px;
    font-weight: 600;
    flex: 1;
    text-align: center;
  }

  /* Modal Controls */
  .back-btn,
  .close-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .back-btn:hover,
  .close-btn:hover {
    color: white;
    background: #333;
  }

  .back-btn {
    position: absolute;
    left: 20px;
  }

  .close-btn {
    position: absolute;
    right: 20px;
  }

  /* Shared Header Button - unified style across modals */
  .header-btn {
    background: none;
    border: none;
    color: #7C7A85;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
  }

  .header-btn:hover {
    color: #EEEEF0;
  }

  /* View Header for internal navigation */
  .view-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #333;
    background: #262626;
  }

  .view-header h4 {
    margin: 0;
    color: white;
    font-size: 16px;
    font-weight: 600;
    flex: 1;
    text-align: center;
  }

  .view-header .back-btn {
    position: static;
  }

  .refresh-btn {
    background: none;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 8px;
    border-radius: 8px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  }

  .refresh-btn:hover {
    color: white;
    background: #333;
  }

  /* Modal Body */
  .modal-body {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .modal-body::-webkit-scrollbar {
    display: none;
  }

  /* Common Card Styles */
  .card,
  .section-card {
    background: #262626;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .card:last-child,
  .section-card:last-child {
    margin-bottom: 0;
  }

  /* Form Elements */
  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    color: #888;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .form-input,
  .form-textarea,
  .form-select {
    width: 100%;
    padding: 12px 16px;
    background: #262626;
    border: 1px solid #333;
    border-radius: 8px;
    color: white;
    font-size: 14px;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .form-input:focus,
  .form-textarea:focus,
  .form-select:focus {
    outline: none;
    border-color: #6bc36b;
  }

  .form-input::placeholder,
  .form-textarea::placeholder {
    color: #666;
  }

  /* Buttons */
  .btn {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-decoration: none;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .btn-primary {
    background: #6bc36b;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #4a9f4a;
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: #333;
    color: white;
    border: 1px solid #404040;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #404040;
    transform: translateY(-1px);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.4);
  }

  .btn-danger:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.6);
    transform: translateY(-1px);
  }

  .btn-info {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.4);
  }

  .btn-info:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-1px);
  }

  /* Status Elements */
  .status-badge {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: capitalize;
  }

  .status-badge.status-active {
    background: rgba(34, 197, 94, 0.2);
    color: #22c55e;
  }

  .status-badge.status-completed {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
  }

  .status-badge.status-cancelled {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }

  .status-badge.status-pending {
    background: rgba(251, 146, 60, 0.2);
    color: #fb923c;
  }

  /* Loading States */
  .loading-state {
    text-align: center;
    padding: 40px 20px;
    color: #888;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #333;
    border-top: 3px solid #6bc36b;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Error States */
  .error-state {
    text-align: center;
    padding: 40px 20px;
    color: #ef4444;
  }

  .error-message {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    padding: 12px;
    color: #ef4444;
    font-size: 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Success States */
  .success-message {
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 8px;
    padding: 12px;
    color: #22c55e;
    font-size: 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Info States */
  .info-message {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 8px;
    padding: 12px;
    color: #3b82f6;
    font-size: 14px;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Grid Layouts */
  .grid {
    display: grid;
    gap: 16px;
  }

  .grid-2 {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  }

  .grid-3 {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }

  /* Info Item Styles - Dark Theme */
  .info-item,
  .metadata-item,
  .coin-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item label,
  .metadata-item label,
  .coin-item label {
    font-weight: 500;
    color: #888;
    font-size: 14px;
    margin-bottom: 4px;
  }

  .info-value,
  .metadata-value,
  .coin-value {
    font-family: monospace;
    font-size: 13px;
    background: #333;
    border: 1px solid #404040;
    padding: 8px 12px;
    border-radius: 6px;
    word-break: break-all;
    color: #ccc;
    line-height: 1.4;
  }

  .info-value.monospace,
  .metadata-value.monospace,
  .coin-value.monospace {
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  .info-value.description,
  .metadata-value.description {
    font-family: inherit;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* Attribute Styles */
  .attribute-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: #333;
    border: 1px solid #404040;
    border-radius: 8px;
  }

  .attribute-name,
  .attribute-type {
    font-weight: 500;
    color: #888;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .attribute-value {
    color: white;
    font-weight: 600;
    font-size: 14px;
  }

  /* URI List Styles */
  .uri-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .uri-item {
    padding: 8px;
    background: #333;
    border: 1px solid #404040;
    border-radius: 6px;
  }

  .uri-link {
    color: #6bc36b;
    text-decoration: underline;
    font-size: 13px;
    word-break: break-all;
    font-family: monospace;
  }

  .uri-link:hover {
    color: #4a9f4a;
  }

  /* NFT Image Styles */
  .nft-image-large {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 200px;
    background: #333;
    border-radius: 8px;
    overflow: hidden;
  }

  .nft-image-large img {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    object-fit: contain;
  }

  .nft-placeholder-large {
    font-size: 64px;
    color: #666;
    text-align: center;
  }

  /* List Styles */
  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .list-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #262626;
    border: 1px solid #333;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .list-item:hover {
    background: #333;
    cursor: pointer;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
      margin: 1rem;
      max-height: 95vh;
    }

    .modal-header {
      padding: 16px;
    }

    .modal-body {
      padding: 16px;
    }

    .back-btn,
    .close-btn,
    .refresh-btn {
      position: static;
    }

    .modal-header {
      flex-direction: row;
      justify-content: space-between;
    }

    .grid-2,
    .grid-3 {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 480px) {
    .modal-content {
      width: 98%;
      margin: 0.5rem;
    }

    .modal-header h2,
    .modal-header h3 {
      font-size: 16px;
    }

    .btn {
      padding: 10px 14px;
      font-size: 13px;
    }
  }
`;

// Utility function to inject styles
export const injectModalStyles = () => {
  if (typeof document !== 'undefined') {
    const styleId = 'shared-modal-styles';
    let existingStyle = document.getElementById(styleId);
    
    if (!existingStyle) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = sharedModalStyles;
      document.head.appendChild(styleElement);
    }
  }
}; 