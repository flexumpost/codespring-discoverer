import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  firstName: string;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  firstName: "",
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading] = useState(true);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loginSessionIdRef = useRef<string | null>(null);

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    loginSessionIdRef.current = null;
  };

  const startLoginTracking = async () => {
    try {
      const res = await supabase.functions.invoke("log-login", {
        body: { action: "login" },
      });
      if (res.data?.session_id) {
        loginSessionIdRef.current = res.data.session_id;
        heartbeatRef.current = setInterval(async () => {
          if (loginSessionIdRef.current) {
            await supabase.functions.invoke("log-login", {
              body: { action: "heartbeat", session_id: loginSessionIdRef.current },
            });
          }
        }, 60_000);
      }
    } catch {
      // silently ignore login tracking errors
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Fetch role with setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            const [{ data: roleData }, { data: profileData }] = await Promise.all([
              supabase.from("user_roles").select("role").eq("user_id", session.user.id).maybeSingle(),
              supabase.from("profiles").select("first_name").eq("id", session.user.id).maybeSingle(),
            ]);
            setRole(roleData?.role ?? null);
            setFirstName(profileData?.first_name ?? "");
            setLoading(false);
          }, 0);

          // Start login tracking on sign in
          if (_event === "SIGNED_IN") {
            stopHeartbeat();
            startLoginTracking();
          }
        } else {
          setRole(null);
          setFirstName("");
          setLoading(false);
          stopHeartbeat();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      stopHeartbeat();
    };
  }, []);

  const signOut = async () => {
    stopHeartbeat();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, role, firstName, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
