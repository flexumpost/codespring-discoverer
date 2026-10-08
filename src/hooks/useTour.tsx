import { createContext, useContext, useState, ReactNode } from "react";

interface TourCtx {
  running: boolean;
  start: () => void;
  stop: () => void;
  stepIndex: number;
  setStepIndex: (i: number) => void;
}

const Ctx = createContext<TourCtx>({ running: false, start: () => {}, stop: () => {}, stepIndex: 0, setStepIndex: () => {} });

// Step index lives here (not in TenantTour) because each page mounts its own layout,
// so the tour component remounts on navigation.
export function TourProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  return (
    <Ctx.Provider value={{
      running, stepIndex, setStepIndex,
      start: () => { setStepIndex(0); setRunning(true); },
      stop: () => { setRunning(false); setStepIndex(0); },
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTour = () => useContext(Ctx);
