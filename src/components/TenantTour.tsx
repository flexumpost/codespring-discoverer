import { useEffect, useMemo, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { useTenants } from "@/hooks/useTenants";
import { useSidebar } from "@/components/ui/sidebar";

const STEP_KEYS: { key: string; target: string; menu?: boolean }[] = [
  { key: "welcome", target: "body" },
  { key: "mail", target: '[data-tour="mail-list"]' },
  { key: "action", target: '[data-tour="mail-action"]' },
  { key: "pickup", target: '[data-tour="mail-action"]' },
  { key: "scan", target: '[data-tour="mail-scan"]' },
  { key: "archive", target: '[data-tour="stats"]' },
  { key: "company", target: '[data-tour="tenant-selector"]' },
  { key: "notifications", target: '[data-tour="notifications"]' },
  { key: "address", target: '[data-tour="nav-address"]', menu: true },
  { key: "automation", target: '[data-tour="nav-automation"]', menu: true },
  { key: "information", target: '[data-tour="nav-information"]', menu: true },
  { key: "done", target: '[data-tour="nav-tour"]', menu: true },
];

export function TenantTour() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const { running, start, stop } = useTour();
  const { selectedTenant, isLoading } = useTenants();
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [stepIndex, setStepIndex] = useState(0);

  const guardBlocking = !selectedTenant || (selectedTenant as any).shipping_confirmed !== true;

  // Auto-start once for new tenants
  useEffect(() => {
    if (role !== "tenant" || !user || pathname !== "/" || isLoading || guardBlocking) return;
    supabase.from("profiles").select("tour_completed_at").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data && !(data as any).tour_completed_at) setTimeout(start, 800);
    });
  }, [role, user?.id, pathname, isLoading, guardBlocking]);

  useEffect(() => { if (running) setStepIndex(0); }, [running]);

  const steps: Step[] = useMemo(() => STEP_KEYS
    .filter((s) => s.target === "body" || s.menu || document.querySelector(s.target))
    .map((s) => ({
      target: s.target,
      placement: s.target === "body" ? "center" : "auto",
      disableBeacon: true,
      title: t(`tour.${s.key}.title`),
      content: t(`tour.${s.key}.body`),
      data: { menu: !!s.menu },
    })), [running, t]);

  const finish = async () => {
    stop();
    if (isMobile) setOpenMobile(false);
    if (user) await supabase.from("profiles").update({ tour_completed_at: new Date().toISOString() } as any).eq("id", user.id);
  };

  const onCb = (d: CallBackProps) => {
    if (d.status === STATUS.FINISHED || d.status === STATUS.SKIPPED || d.action === "close") { finish(); return; }
    if (d.type === "step:after" || d.type === "error:target_not_found") {
      const next = d.index + (d.action === "prev" ? -1 : 1);
      const nextStep = steps[next];
      if (isMobile) setOpenMobile(!!(nextStep?.data as any)?.menu);
      setTimeout(() => setStepIndex(next), isMobile ? 300 : 0);
    }
  };

  if (role !== "tenant" || !running) return null;

  return (
    <Joyride
      steps={steps}
      run={running}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      callback={onCb}
      locale={{ back: t("tour.back"), next: t("tour.next"), last: t("tour.finish"), skip: t("tour.skip"), close: t("tour.finish") }}
      styles={{ options: { primaryColor: "hsl(var(--primary))", zIndex: 10000 } }}
    />
  );
}
