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

const SetPasswordPage = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (accessToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to set session from hash:", error);
          toast({ title: t("common.error"), description: t("setPassword.invalidLink"), variant: "destructive" });
        } else {
          setIsReady(true);
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setIsReady(true);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") setIsReady(true);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

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
          <CardTitle className="text-2xl">{t("setPassword.title")}</CardTitle>
          <CardDescription>
            {isReady ? t("setPassword.subtitle") : t("setPassword.waitingForLink")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReady ? (
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
          ) : (
            <p className="text-center text-muted-foreground">{t("common.loading")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPasswordPage;
