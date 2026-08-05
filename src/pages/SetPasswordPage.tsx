import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LanguageToggle } from "@/components/LanguageToggle";
import flexumLogo from "@/assets/flexum-coworking-logo.png";

type PendingToken =
  | { kind: "onboarding"; token: string }
  | { kind: "pkce"; code: string }
  | { kind: "hash"; accessToken: string; refreshToken: string };

const SetPasswordPage = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const [technicalError, setTechnicalError] = useState(false);
  const [pending, setPending] = useState<PendingToken | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);

    // Explicit error in hash (Supabase told us the link is dead) — no need to try.
    const errorParam = hashParams.get("error") || hashParams.get("error_code");
    if (errorParam) {
      setLinkExpired(true);
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // 1. Custom 24h onboarding token
    const onboardingToken = searchParams.get("onboarding_token");
    if (onboardingToken) {
      setPending({ kind: "onboarding", token: onboardingToken });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // 2. PKCE code
    const code = searchParams.get("code");
    if (code) {
      setPending({ kind: "pkce", code });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // 3. Hash-based tokens (implicit flow)
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
      setPending({
        kind: "hash",
        accessToken,
        refreshToken: hashParams.get("refresh_token") || "",
      });
      window.history.replaceState(null, "", window.location.pathname);
      return;
    }

    // 4. No token in URL — user may already have a session (e.g. onAuthStateChange PASSWORD_RECOVERY)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") setIsReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleConfirm = async () => {
    if (!pending) return;
    const tokenToComplete = pending.kind === "onboarding" ? pending.token : null;
    setConfirming(true);
    setTechnicalError(false);
    try {
      if (pending.kind === "onboarding") {
        const { data, error } = await supabase.functions.invoke("consume-onboarding-token", {
          body: { token: pending.token },
        });
        if (data?.error === "token_used" || data?.error === "token_expired" || data?.error === "invalid_token") {
          setLinkExpired(true);
          setPending(null);
          return;
        }
        if (error || !data?.hashed_token) {
          console.error("Failed to consume onboarding token:", error, data);
          setTechnicalError(true);
          return;
        }
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: data.type === "recovery" ? "recovery" : "magiclink",
        });
        if (verifyErr) {
          console.error("verifyOtp failed:", verifyErr);
          setTechnicalError(true);
        } else {
          const { error: completeError } = await supabase.functions.invoke("consume-onboarding-token", {
            body: { token: tokenToComplete, action: "complete" },
          });
          if (completeError) {
            console.error("Failed to complete onboarding token:", completeError);
            setTechnicalError(true);
            return;
          }
          setIsReady(true);
          setPending(null);
        }
      } else if (pending.kind === "pkce") {
        const { error } = await supabase.auth.exchangeCodeForSession(pending.code);
        if (error) {
          console.error("Failed to exchange code for session:", error);
          setLinkExpired(true);
        } else {
          setIsReady(true);
        }
      } else if (pending.kind === "hash") {
        const { error } = await supabase.auth.setSession({
          access_token: pending.accessToken,
          refresh_token: pending.refreshToken,
        });
        if (error) {
          console.error("Failed to set session from hash:", error);
          setLinkExpired(true);
        } else {
          setIsReady(true);
        }
      }
    } catch (e) {
      console.error("Confirm failed:", e);
      setTechnicalError(true);
    } finally {
      setConfirming(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: t("common.error"), description: t("setPassword.passwordsMismatch"), variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: t("common.error"), description: t("setPassword.passwordTooShort"), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: t("setPassword.passwordCreated"), description: t("setPassword.youAreLoggedIn") });
      navigate("/");
    } catch (error: any) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Description under title
  let description = t("setPassword.waitingForLink");
  if (linkExpired) description = t("setPassword.linkExpired");
  else if (isReady) description = t("setPassword.subtitle");
  else if (pending) description = t("setPassword.confirmDescription");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={flexumLogo} alt="Flexum Coworking" className="h-14" />
          </div>
          <CardTitle className="text-2xl">
            {linkExpired
              ? t("setPassword.linkExpired")
              : pending && !isReady
                ? t("setPassword.confirmTitle")
                : t("setPassword.title")}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {linkExpired ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                {t("setPassword.linkExpiredCanRequestNew")}
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                {t("setPassword.requestNewLink")}
              </Button>
              <Button variant="link" className="w-full" onClick={() => navigate("/login")}>
                {t("setPassword.backToLogin")}
              </Button>
            </div>
          ) : isReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t("setPassword.newPassword")}</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t("setPassword.confirmPassword")}</Label>
                <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t("common.pleaseWait") : t("setPassword.createPassword")}
              </Button>
            </form>
          ) : pending ? (
            <div className="space-y-4">
              {technicalError && (
                <p className="text-center text-sm text-destructive">
                  Der opstod en teknisk fejl. Linket er stadig gyldigt, så prøv igen.
                </p>
              )}
              <Button className="w-full" onClick={handleConfirm} disabled={confirming}>
                {confirming ? t("common.pleaseWait") : t("setPassword.confirmButton")}
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPasswordPage;
