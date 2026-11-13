import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LockKeyhole, LogIn, UserPlus } from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase.js";
import PublicLanding from "./PublicLanding.jsx";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    let authEventObserved = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      authEventObserved = true;
      setSession(nextSession);
      setAuthLoading(false);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (authEventObserved) return;
      if (error) {
        setProfileError("Sesi akun tidak bisa dipulihkan. Coba masuk kembali.");
        console.error("Could not restore the Supabase session.", error);
      }
      setSession(data?.session ?? null);
      setAuthLoading(false);
    }).catch((error) => {
      if (!active) return;
      if (authEventObserved) return;
      console.error("Could not restore the Supabase session.", error);
      setProfileError("Sesi akun tidak bisa dipulihkan. Coba masuk kembali.");
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setProfile(null);
      setProfileUserId(null);
      setProfileError("");
      return;
    }
    const userId = session.user.id;
    let active = true;
    setProfile(null);
    setProfileUserId(null);
    setProfileError("");
    supabase
      .from("profiles")
      .select("plan,subscription_status,current_period_end")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error("Could not load the account plan.", error);
          setProfileError("Paket akun belum bisa dimuat. Hubungi admin atau coba lagi.");
          setProfile(null);
          setProfileUserId(userId);
          return;
        }
        setProfile(data);
        setProfileError(data ? "" : "Profil akun belum tersedia. Hubungi admin.");
        setProfileUserId(userId);
      })
      .catch((error) => {
        if (!active) return;
        console.error("Could not load the account plan.", error);
        setProfile(null);
        setProfileError("Paket akun belum bisa dimuat. Coba refresh halaman.");
        setProfileUserId(userId);
      });
    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    plan: profile?.plan === "pro" && profile.subscription_status === "active" ? "pro" : "free",
    profileUserId,
    profileError,
    authLoading,
    signOut: () => supabase?.auth.signOut(),
  }), [session, profile, profileUserId, profileError, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const AuthScreen = ({ initialMode = "sign-in", onBack }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const result = mode === "sign-in"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (mode === "sign-up" && !result.data.session) {
        setNotice("Cek email untuk verifikasi akun sebelum masuk.");
      }
    } catch (authError) {
      console.error("Framefolk authentication failed.", authError);
      setError(authError.message || "Akun tidak bisa diproses. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        {onBack && (
          <button type="button" className="auth-back" onClick={onBack}>
            <ArrowLeft size={14} /> Kembali ke beranda
          </button>
        )}
        <div className="auth-brand">
          <span className="brand-mark"><LockKeyhole size={18} /></span>
          <span>framefolk<span className="brand-dot">.</span></span>
        </div>
        <span className="mini-eyebrow">YOUR VIDEO STUDIO, READY WHEN YOU ARE</span>
        <h1 id="auth-title">{mode === "sign-in" ? "Masuk ke studio." : "Bikin akun Framefolk."}</h1>
        <p>Project tersimpan ke akunmu supaya bisa lanjut dari perangkat lain.</p>

        <form className="auth-form" onSubmit={submit}>
          <label className="edit-field">
            <span>EMAIL</span>
            <input
              className="text-input"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="edit-field">
            <span>PASSWORD</span>
            <input
              className="text-input"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              minLength={mode === "sign-up" ? 8 : undefined}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <small>Minimal 8 karakter.</small>
          </label>
          {error && <p className="auth-message error" role="alert">{error}</p>}
          {notice && <p className="auth-message success" role="status">{notice}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={submitting}>
            {mode === "sign-in" ? <LogIn size={15} /> : <UserPlus size={15} />}
            {submitting ? "Sebentar..." : mode === "sign-in" ? "Masuk" : "Buat akun"}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((current) => current === "sign-in" ? "sign-up" : "sign-in");
            setError("");
            setNotice("");
          }}
        >
          {mode === "sign-in" ? "Belum punya akun? Buat akun" : "Sudah punya akun? Masuk"}
        </button>
        <small className="auth-footnote">Jangan pernah bagikan password atau API key ke siapa pun.</small>
      </section>
    </main>
  );
};

export const AuthGate = ({ children }) => {
  const { user, authLoading, profileUserId, profileError } = useAuth();
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    if (user) setAuthMode(null);
  }, [user]);

  if (authLoading && isSupabaseConfigured) {
    return <main className="auth-page"><div className="auth-loading" role="status">Memeriksa sesi akun...</div></main>;
  }
  if (!user) {
    if (isSupabaseConfigured && authMode) {
      return <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} />;
    }
    return (
      <PublicLanding
        supabaseConfigured={isSupabaseConfigured}
        onStart={() => setAuthMode("sign-up")}
        onSignIn={() => setAuthMode("sign-in")}
      />
    );
  }
  if (profileUserId !== user.id) {
    return <main className="auth-page"><div className="auth-loading" role="status">Menyiapkan profil akun...</div></main>;
  }
  if (profileError) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <h1>Akun belum siap.</h1>
          <p>{profileError}</p>
          <button type="button" className="button button-quiet" onClick={() => supabase.auth.signOut()}>
            Keluar
          </button>
        </section>
      </main>
    );
  }
  return children;
};
