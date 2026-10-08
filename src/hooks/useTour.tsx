import { createContext, useContext, useState, ReactNode } from "react";

interface TourCtx {
  running: boolean;
  start: () => void;
  stop: () => void;
}

const Ctx = createContext<TourCtx>({ running: false, start: () => {}, stop: () => {} });

export function TourProvider({ children }: { children: ReactNode }) {
  const [running, setRunning] = useState(false);
  return (
    <Ctx.Provider value={{ running, start: () => setRunning(true), stop: () => setRunning(false) }}>
      {children}
    </Ctx.Provider>
  );
}

export const useTour = () => useContext(Ctx);
