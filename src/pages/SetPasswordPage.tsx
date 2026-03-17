import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import flexumLogo from "@/assets/flexum-coworking-logo.png";

const SetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Parse hash fragment for access_token (invite/recovery links)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken) {
      // Explicitly set session from the URL tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      }).then(({ error }) => {
        if (error) {
          console.error("Failed to set session from hash:", error);
          toast({ title: "Fejl", description: "Linket er ugyldigt eller udløbet. Prøv igen.", variant: "destructive" });
        } else {
          setIsReady(true);
          // Clean hash from URL
          window.history.replaceState(null, "", window.location.pathname);
        }
      });
    } else {
      // No hash tokens — check existing session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setIsReady(true);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
          setIsReady(true);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Fejl", description: "Adgangskoderne matcher ikke", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Fejl", description: "Adgangskoden skal være mindst 6 tegn", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: "Adgangskode oprettet", description: "Du er nu logget ind" });
      navigate("/");
    } catch (error: any) {
      toast({ title: "Fejl", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <img src={flexumLogo} alt="Flexum Coworking" className="h-14" />
          </div>
          <CardTitle className="text-2xl">Opret din adgangskode</CardTitle>
          <CardDescription>
            {isReady
              ? "Vælg en adgangskode for at fuldføre din konto"
              : "Vent venligst mens vi bekræfter dit link..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isReady ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Ny adgangskode</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Bekræft adgangskode</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Vent venligst..." : "Opret adgangskode"}
              </Button>
            </form>
          ) : (
            <p className="text-center text-muted-foreground">Indlæser...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPasswordPage;
