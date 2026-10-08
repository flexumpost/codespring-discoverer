import { useEffect, useMemo, useState } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTour } from "@/hooks/useTour";
import { useTenants } from "@/hooks/useTenants";
import { useSidebar } from "@/components/ui/sidebar";
import { ChooseActionDialog } from "@/components/ChooseActionDialog";
import { buildActionCards } from "@/lib/mailActions";
import { baseTier } from "@/lib/tiers";

const STEP_KEYS: { key: string; target: string; menu?: boolean; card?: string }[] = [
  { key: "welcome", target: "body" },
  { key: "mail", target: '[data-tour="mail-list"]' },
  { key: "action", target: '[data-tour="mail-action"]' },
  { key: "pickup", target: '[data-tour="action-dialog"]', card: "dialog" },
  { key: "standardPickup", target: '[data-tour="action-standard_pickup"]', card: "standard_pickup" },
  { key: "fastPickup", target: '[data-tour="action-fast_pickup"]', card: "fast_pickup" },
  { key: "scanNow", target: '[data-tour="action-scan_now"]', card: "scan_now" },
  { key: "standardScan", target: '[data-tour="action-standard_scan"]', card: "standard_scan" },
  { key: "shipment", target: '[data-tour="action-standard_send"]', card: "standard_send" },
  { key: "destroy", target: '[data-tour="action-destroy"]', card: "destroy" },
  { key: "cancel", target: '[data-tour="action-cancel"]', card: "cancel" },
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
  const [ready, setReady] = useState(false);
  const rawTier = selectedTenant?.tenant_types?.name;
  const previewCards = useMemo(() => buildActionCards({
    item: { mail_type: "brev", status: "ny", chosen_action: "tour_preview", scan_url: null },
    tier: baseTier(rawTier), rawTier, t,
  }), [rawTier, t]);

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
    .filter((s) => s.card ? s.card === "dialog" || previewCards.some((card) => card.key === s.card) : s.target === "body" || s.menu || document.querySelector(s.target))
    .map((s) => ({
      target: s.target,
      placement: s.target === "body" ? "center" : "auto",
      disableBeacon: true,
      title: t(`tour.${s.key}.title`),
      content: t(`tour.${s.key}.body`),
      data: { menu: !!s.menu, dialog: !!s.card },
    })), [running, t, previewCards]);

  const dialogOpen = running && !!steps[stepIndex]?.data?.dialog;
  useEffect(() => {
    setReady(false);
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, [stepIndex, running]);

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
      setReady(false);
      setTimeout(() => setStepIndex(next), isMobile ? 300 : 0);
    }
  };

  if (role !== "tenant" || !running) return null;

  return (
    <>
    <ChooseActionDialog
      open={dialogOpen}
      onOpenChange={(open) => { if (!open) finish(); }}
      title={t("tenantDashboard.selectAction")}
      description={`${t("common.letter")} · ${t("tour.demoBadge")}`}
      cards={previewCards}
      onSelect={() => {}}
      tourPreview
    />
    <Joyride
      steps={steps}
      run={running && ready}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      callback={onCb}
      locale={{ back: t("tour.back"), next: t("tour.next"), nextLabelWithProgress: t("tour.nextProgress"), last: t("tour.finish"), skip: t("tour.skip"), close: t("tour.finish") }}
      styles={{ options: { primaryColor: "hsl(var(--primary))", zIndex: 10000 } }}
    />
    </>
  );
}
