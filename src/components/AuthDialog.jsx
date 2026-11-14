import { useEffect, useState } from 'react';

function AuthDialog({ mode, onModeChange, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const isSignUp = mode === 'signup';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), email: email.trim(), password });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop auth-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-heading" onSubmit={handleSubmit}>
        <div className="auth-dialog__hero">
          <button className="icon-button auth-dialog__close" type="button" aria-label="Close sign-in dialog" onClick={onClose}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m18 6-12 12M6 6l12 12" /></svg>
          </button>
          <span className="auth-dialog__sticker" aria-hidden="true">{isSignUp ? '✿' : '♡'}</span>
          <span className="eyebrow">{isSignUp ? 'A LITTLE SPACE JUST FOR YOU' : 'YOUR THOUGHTS MISSED YOU'}</span>
          <h2 id="auth-heading">{isSignUp ? 'Join the cozy club' : 'Welcome back, lovely'}</h2>
          <p>{isSignUp ? 'Save your seat and make room for more good ideas.' : 'Pick up right where your thoughts left off.'}</p>
        </div>

        <div className="auth-dialog__fields">
          {isSignUp && (
            <label className="field-label" htmlFor="auth-name">
              Your name
              <input
                autoComplete="name"
                id="auth-name"
                maxLength={60}
                placeholder="What should we call you?"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
          )}
          <label className="field-label" htmlFor="auth-email">
            Email address
            <input
              autoComplete="email"
              id="auth-email"
              placeholder="you@example.com"
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <div className="field-label">
            <label htmlFor="auth-password">Password</label>
            <span className="auth-password">
              <input
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                id="auth-password"
                maxLength={72}
                minLength={8}
                placeholder="At least 8 characters"
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="auth-password__toggle"
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((isShown) => !isShown)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </span>
          </div>

          {error && <p className="auth-dialog__error" role="alert">{error}</p>}
          <button className="button button--signup auth-dialog__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'One little moment...' : isSignUp ? 'Create my account' : 'Sign in to my notes'}
            <span aria-hidden="true">✦</span>
          </button>
          <p className="auth-dialog__demo">Your password is securely hashed, and your notes stay linked to your account.</p>
          <p className="auth-dialog__switch">
            {isSignUp ? 'Already have a little account?' : 'New to Little Notes?'}
            <button type="button" onClick={() => {
              setError('');
              onModeChange(isSignUp ? 'signin' : 'signup');
            }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}

export default AuthDialog;
