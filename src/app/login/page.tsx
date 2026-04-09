"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import { LogIn, UserPlus, AlertCircle, CheckCircle2, X, Check, Loader2, Mail, Lock, User, Zap } from "lucide-react";
import { signUp, signIn, sendPasswordResetEmail } from "@/app/actions/auth";
import { validateRegistrationForm, validateLoginForm, hasErrors } from "@/utils/auth/validation";
import type { FormErrors } from "@/types/auth";

const CustomInput = ({
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  rightIcon,
  tooltipText,
  icon: Icon,
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  rightIcon?: React.ReactNode;
  tooltipText?: string;
  icon?: React.FC<{ className?: string }>;
}) => (
  <div className="flex flex-col gap-1.5">
    <div className="relative group">
      {Icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          input-dark w-full
          ${Icon ? "!pl-11" : ""}
          ${rightIcon ? "!pr-12" : ""}
        `}
        style={{ fontFamily: "var(--font-space-mono)" }}
      />
      {rightIcon && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="relative group/tooltip">
            {rightIcon}
            {tooltipText && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block pointer-events-none z-50">
                <div className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs px-3 py-2 rounded-lg whitespace-nowrap border border-[var(--border-subtle)]">
                  {tooltipText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    {error && (
      <span className="text-xs text-[var(--accent-pink)] ml-1">{error}</span>
    )}
  </div>
);

export default function AuthPage() {
  const [username, setUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetForm, setShowResetForm] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<FormErrors>({});
  const [loginErrors, setLoginErrors] = useState<FormErrors>({});
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [usernameCheckState, setUsernameCheckState] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameValid, setUsernameValid] = useState<boolean | null>(null);
  const [usernameEverInvalid, setUsernameEverInvalid] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailEverInvalid, setEmailEverInvalid] = useState(false);
  const [emailsMatch, setEmailsMatch] = useState<boolean | null>(null);
  const [emailMatchEverInvalid, setEmailMatchEverInvalid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);
  const [passwordMatchEverInvalid, setPasswordMatchEverInvalid] = useState(false);
  const [passwordValid, setPasswordValid] = useState<boolean | null>(null);
  const [passwordEverInvalid, setPasswordEverInvalid] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterErrors({});
    setRegisterSuccess("");
    const errors = validateRegistrationForm(username, registerEmail, confirmEmail, registerPassword, confirmPassword);
    if (hasErrors(errors)) {
      setRegisterErrors(errors);
      return;
    }
    setRegisterLoading(true);
    try {
      const result = await signUp({ email: registerEmail, password: registerPassword, username: username });
      if (!result.success) {
        setRegisterErrors({ general: result.error });
      } else {
        setRegisterSuccess("Account created! Check your email.");
        setUsername("");
        setRegisterEmail("");
        setConfirmEmail("");
        setRegisterPassword("");
        setConfirmPassword("");
      }
    } catch {
      setRegisterErrors({ general: "Unexpected error occurred." });
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    const errors = validateLoginForm(loginEmail, loginPassword);
    if (hasErrors(errors)) {
      setLoginErrors(errors);
      return;
    }
    setLoginLoading(true);
    try {
      const result = await signIn({ email: loginEmail, password: loginPassword });
      if (!result.success) setLoginErrors({ general: result.error });
    } catch (error) {
      if (error && typeof error === 'object' && 'digest' in error) {
        throw error;
      }
      setLoginErrors({ general: "Unexpected error occurred." });
    } finally {
      setLoginLoading(false);
    }
  };

  React.useEffect(() => {
    if (!username) {
      setUsernameValid(null);
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    const isValid = usernameRegex.test(username) && username.length >= 3;
    setUsernameValid(isValid);
    if (isValid === false) setUsernameEverInvalid(true);
  }, [username]);

  React.useEffect(() => {
    if (!username || username.length < 3 || !usernameValid) {
      setUsernameCheckState('idle');
      return;
    }
    setUsernameCheckState('checking');
    const timeoutId = setTimeout(async () => {
      try {
        const response = await fetch('/api/check-username', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.toLowerCase() })
        });
        const data = await response.json();
        setUsernameCheckState(data.available ? 'available' : 'taken');
      } catch {
        setUsernameCheckState('idle');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [username, usernameValid]);

  React.useEffect(() => {
    if (!registerEmail) {
      setEmailValid(null);
      return;
    }
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail);
    setEmailValid(isValid);
    if (isValid === false) setEmailEverInvalid(true);
  }, [registerEmail]);

  React.useEffect(() => {
    if (!confirmEmail) {
      setEmailsMatch(null);
      return;
    }
    if (registerEmail) {
      const match = registerEmail === confirmEmail;
      setEmailsMatch(match);
      if (match === false) setEmailMatchEverInvalid(true);
    } else {
      setEmailsMatch(null);
    }
  }, [confirmEmail, registerEmail]);

  React.useEffect(() => {
    if (!registerPassword) {
      setPasswordValid(null);
      return;
    }
    const hasMinLength = registerPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(registerPassword);
    const hasNumber = /[0-9]/.test(registerPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(registerPassword);
    const isValid = hasMinLength && hasUpperCase && hasNumber && hasSpecialChar;
    setPasswordValid(isValid);
    if (isValid === false) setPasswordEverInvalid(true);
  }, [registerPassword]);

  React.useEffect(() => {
    if (!confirmPassword) {
      setPasswordsMatch(null);
      return;
    }
    if (registerPassword) {
      const match = registerPassword === confirmPassword;
      setPasswordsMatch(match);
      if (match === false) setPasswordMatchEverInvalid(true);
    } else {
      setPasswordsMatch(null);
    }
  }, [confirmPassword, registerPassword]);

  const isFormValid =
    usernameCheckState === 'available' &&
    emailValid === true &&
    emailsMatch === true &&
    passwordValid === true &&
    passwordsMatch === true;

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setLoginErrors({ general: "Please enter email" });
      return;
    }
    setResetLoading(true);
    setLoginErrors({});
    setResetSuccess("");
    try {
      const result = await sendPasswordResetEmail(resetEmail);
      if (!result.success) {
        setLoginErrors({ general: result.error });
      } else {
        setResetSuccess("Reset link sent!");
        setResetEmail("");
        setShowResetForm(false);
      }
    } catch {
      setLoginErrors({ general: "Unexpected error occurred." });
    } finally {
      setResetLoading(false);
    }
  };

  const getValidationIcon = (isValid: boolean | null, everInvalid: boolean, isEmpty: boolean) => {
    if (isEmpty && everInvalid) return <X className="w-4 h-4 text-[var(--accent-pink)]" />;
    if (isValid === true) return <Check className="w-4 h-4 text-[var(--accent-green)]" />;
    if (isValid === false) return <X className="w-4 h-4 text-[var(--accent-pink)]" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] grid-bg flex flex-col">
      <Header />

      <div className="flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-8 animate-slide-down">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-[var(--accent-cyan)]" />
              <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-space-mono)" }}>
                <span className="text-[var(--text-primary)]">JOIN THE </span>
                <span className="neon-cyan">GAME</span>
              </h1>
            </div>
            <p className="text-[var(--text-muted)]">Track your progress & compete on the leaderboard</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Register Card */}
            <div className="card-glow p-8 animate-slide-up">
              <div className="flex items-center gap-2 mb-6">
                <UserPlus className="w-5 h-5 text-[var(--accent-cyan)]" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-space-mono)" }}>
                  REGISTER
                </h2>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                {registerSuccess && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{registerSuccess}</span>
                  </div>
                )}

                {registerErrors.general && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 text-[var(--accent-pink)] text-sm rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{registerErrors.general}</span>
                  </div>
                )}

                <CustomInput
                  type="text"
                  placeholder="username"
                  value={username}
                  onChange={setUsername}
                  error={registerErrors.username}
                  icon={User}
                  rightIcon={
                    usernameValid === false || (usernameEverInvalid && !username) ? (
                      <X className="w-4 h-4 text-[var(--accent-pink)]" />
                    ) : usernameCheckState === 'checking' ? (
                      <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
                    ) : usernameCheckState === 'available' ? (
                      <Check className="w-4 h-4 text-[var(--accent-green)]" />
                    ) : usernameCheckState === 'taken' ? (
                      <X className="w-4 h-4 text-[var(--accent-pink)]" />
                    ) : null
                  }
                  tooltipText={
                    usernameValid === false || (usernameEverInvalid && !username)
                      ? "3+ chars, letters/numbers/_/- only"
                      : usernameCheckState === 'taken'
                      ? "Username already taken"
                      : undefined
                  }
                />

                <CustomInput
                  type="email"
                  placeholder="email"
                  value={registerEmail}
                  onChange={setRegisterEmail}
                  error={registerErrors.email}
                  icon={Mail}
                  rightIcon={getValidationIcon(emailValid, emailEverInvalid, !registerEmail)}
                  tooltipText={emailValid === false || (emailEverInvalid && !registerEmail) ? "Invalid email format" : undefined}
                />

                <CustomInput
                  type="email"
                  placeholder="verify email"
                  value={confirmEmail}
                  onChange={setConfirmEmail}
                  error={registerErrors.confirmEmail}
                  icon={Mail}
                  rightIcon={getValidationIcon(emailsMatch, emailMatchEverInvalid, !confirmEmail)}
                  tooltipText={emailsMatch === false || (emailMatchEverInvalid && !confirmEmail) ? "Emails don't match" : undefined}
                />

                <CustomInput
                  type="password"
                  placeholder="password"
                  value={registerPassword}
                  onChange={setRegisterPassword}
                  error={registerErrors.password}
                  icon={Lock}
                  rightIcon={getValidationIcon(passwordValid, passwordEverInvalid, !registerPassword)}
                  tooltipText={passwordValid === false || (passwordEverInvalid && !registerPassword) ? "8+ chars, uppercase, number, special" : undefined}
                />

                <CustomInput
                  type="password"
                  placeholder="verify password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  error={registerErrors.confirmPassword}
                  icon={Lock}
                  rightIcon={getValidationIcon(passwordsMatch, passwordMatchEverInvalid, !confirmPassword)}
                  tooltipText={passwordsMatch === false || (passwordMatchEverInvalid && !confirmPassword) ? "Passwords don't match" : undefined}
                />

                <button
                  type="submit"
                  disabled={registerLoading || !isFormValid}
                  className={`
                    mt-2 w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2
                    ${isFormValid
                      ? 'btn-neon'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]'
                    }
                  `}
                  style={{ fontFamily: "var(--font-space-mono)" }}
                >
                  {registerLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      SIGN UP
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Login Card */}
            <div className="card-glow p-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="flex items-center gap-2 mb-6">
                <LogIn className="w-5 h-5 text-[var(--accent-purple)]" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-space-mono)" }}>
                  LOGIN
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {resetSuccess && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/30 text-[var(--accent-green)] text-sm rounded-lg">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{resetSuccess}</span>
                  </div>
                )}

                {loginErrors.general && (
                  <div className="flex items-center gap-3 p-3 bg-[var(--accent-pink)]/10 border border-[var(--accent-pink)]/30 text-[var(--accent-pink)] text-sm rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{loginErrors.general}</span>
                  </div>
                )}

                {showResetForm ? (
                  <div className="space-y-4 animate-fade-in">
                    <p className="text-[var(--text-muted)] text-sm">Enter your email to reset password:</p>
                    <CustomInput
                      type="email"
                      placeholder="email"
                      value={resetEmail}
                      onChange={setResetEmail}
                      icon={Mail}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowResetForm(false);
                          setResetEmail("");
                          setLoginErrors({});
                        }}
                        className="flex-1 btn-ghost text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePasswordReset}
                        disabled={resetLoading}
                        className="flex-1 btn-neon text-sm flex items-center justify-center gap-2"
                      >
                        {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Link"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <CustomInput
                      type="email"
                      placeholder="email"
                      value={loginEmail}
                      onChange={setLoginEmail}
                      error={loginErrors.email}
                      icon={Mail}
                    />
                    <CustomInput
                      type="password"
                      placeholder="password"
                      value={loginPassword}
                      onChange={setLoginPassword}
                      error={loginErrors.password}
                      icon={Lock}
                    />

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="mt-2 w-full btn-neon py-3 flex items-center justify-center gap-2"
                      style={{ fontFamily: "var(--font-space-mono)" }}
                    >
                      {loginLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <LogIn className="w-4 h-4" />
                          SIGN IN
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-[var(--text-muted)] hover:text-[var(--accent-cyan)] text-sm transition-colors self-end"
                    >
                      Forgot password?
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
