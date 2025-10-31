import { createContext, useContext, useMemo, useState, type PropsWithChildren, type ReactNode } from "react";

type GlobalMenuContextValue = {
  content: ReactNode;
  setContent: (content: ReactNode) => void;
};

const GlobalMenuContext = createContext<GlobalMenuContextValue | undefined>(undefined);

export const GlobalMenuProvider = ({ children }: PropsWithChildren): JSX.Element => {
  const [content, setContent] = useState<ReactNode>(null);

  const value = useMemo(() => ({ content, setContent }), [content]);

  return <GlobalMenuContext.Provider value={value}>{children}</GlobalMenuContext.Provider>;
};

// This hook intentionally lives alongside the provider; suppress the fast-refresh advisory.
// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalMenu = () => {
  const context = useContext(GlobalMenuContext);
  if (!context) {
    throw new Error("useGlobalMenu must be used within a GlobalMenuProvider");
  }
  return context;
};
