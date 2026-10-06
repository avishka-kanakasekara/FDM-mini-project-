import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { ApiError } from "../services/api";

export function SignIn() {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const destination = (location.state as { from?: string } | null)?.from || "/";

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
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Sign in could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AccountFrame
      title="Sign in"
      subtitle="Use your campaign-desk account to score customers and build today's call list."
    >
      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <Field label="Email" id="sign-in-email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field
          label="Password"
          id="sign-in-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
        />
        {error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted">
        New to the desk?{" "}
        <Link to="/sign-up" className="font-semibold text-leaf underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AccountFrame>
  );
}

export function AccountFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#f3d7a4] to-[#c48945] font-serif text-xl text-spruce-deep">
            B
          </span>
          <div>
            <p className="font-serif text-2xl leading-none">BankReach</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Campaign desk</p>
          </div>
        </div>
        <section className="panel p-6">
          <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  type,
  autoComplete,
  value,
  onChange,
}: {
  label: string;
  id: string;
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
