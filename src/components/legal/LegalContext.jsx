import { createContext, useContext } from "react";
import { useLegalSettings, EMPTY_LEGAL } from "../../hooks/useLegalSettings";

const LegalContext = createContext({ legal: EMPTY_LEGAL, loading: false });

/** Carga los datos legales de la organización y los comparte con las páginas informativas. */
export function LegalProvider({ children }) {
  const { legal, loading } = useLegalSettings();
  return <LegalContext.Provider value={{ legal, loading }}>{children}</LegalContext.Provider>;
}

export const useLegal = () => useContext(LegalContext);
