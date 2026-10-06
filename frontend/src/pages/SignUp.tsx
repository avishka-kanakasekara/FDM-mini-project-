import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/api";
import { AccountFrame } from "./SignIn";

export function SignUp() {
  const { user, loading, signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm font-semibold text-muted">Checking your account...</p>
      </div>
    );
  }
  if (user) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const message = validate(name, email, password, confirm);
    setError(message);
    if (message) {
      return;
    }
    setSubmitting(true);
    try {
      await signUp(name, email, password);
      navigate("/", { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "The account could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountFrame
      title="Create an account"
      subtitle="An account keeps the campaign desk for your team. Scoring still uses the saved model."
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <LabeledInput id="sign-up-name" label="Name" type="text" autoComplete="name" value={name} onChange={setName} />
        <LabeledInput id="sign-up-email" label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <LabeledInput
          id="sign-up-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
        />
        <LabeledInput
          id="sign-up-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />
        <p className="text-xs leading-5 text-muted">Use at least 8 characters.</p>
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Already have an account?{" "}
        <Link to="/sign-in" className="font-semibold text-leaf underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AccountFrame>
  );
}

function validate(name: string, email: string, password: string, confirm: string): string | null {
  if (!name.trim()) {
    return "Enter your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirm) {
    return "Passwords do not match.";
  }
  return null;
}

function LabeledInput({
  id,
  label,
  type,
  autoComplete,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="field"
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
