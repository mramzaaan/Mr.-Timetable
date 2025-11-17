import React, { useState } from 'react';

interface LoginModalProps {
  t: any; // Translation object
  onLogin: (userId: string) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ t, onLogin }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loginModalTitle"
    >
      <div className="bg-[var(--bg-secondary)] p-8 rounded-xl shadow-2xl max-w-sm w-full mx-4 transform scale-95 opacity-0 animate-scale-in">
        <h3 id="loginModalTitle" className="text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">
          {t.loginTitle}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              {t.enterUsername}
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
              placeholder="e.g., JohnDoe"
              required
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] transition-colors"
            >
              {t.login}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;