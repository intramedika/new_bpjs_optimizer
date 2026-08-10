import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Claim } from "../types";

interface ClaimContextType {
  activeClaimId: string | null;
  activeClaim: Claim | null;
  claims: Claim[];
  selectClaim: (claimId: string, claimData?: Claim) => void;
  clearActiveClaim: () => void;
  refreshClaims: () => Promise<void>;
}

const ClaimContext = createContext<ClaimContextType>({
  activeClaimId: null,
  activeClaim: null,
  claims: [],
  selectClaim: () => {},
  clearActiveClaim: () => {},
  refreshClaims: async () => {}
});

export const ClaimProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(() => {
    return localStorage.getItem("bpjs_active_claim_id");
  });

  const [activeClaim, setActiveClaim] = useState<Claim | null>(() => {
    try {
      const saved = localStorage.getItem("bpjs_active_claim");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [claims, setClaims] = useState<Claim[]>(() => {
    try {
      const saved = localStorage.getItem("bpjs_claims_store");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetchClaims();

    const handleHospitalChange = () => fetchClaims();
    window.addEventListener("hospital-changed", handleHospitalChange);
    return () => window.removeEventListener("hospital-changed", handleHospitalChange);
  }, []);

  const fetchClaims = async () => {
    try {
      let apiList: Claim[] = [];
      try {
        const res = await fetch(`/api/claims?dataMode=ALL`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.startsWith("<") && !text.startsWith("A server error")) {
            const data = JSON.parse(text);
            apiList = Array.isArray(data) ? data : (data.claims || []);
          }
        }
      } catch (err) {
        console.warn("[ClaimContext] Server fetch fallback:", err);
      }

      // Merge API claims with browser persistent claims store
      let localStore: Claim[] = [];
      try {
        const saved = localStorage.getItem("bpjs_claims_store");
        if (saved) localStore = JSON.parse(saved);
      } catch (e) {}

      const mergedList = [...apiList];
      localStore.forEach(c => {
        if (c && c.id && !mergedList.some(m => m.id === c.id)) {
          mergedList.unshift(c);
        }
      });

      if (mergedList.length > 0) {
        setClaims(mergedList);
        if (!activeClaim) {
          setActiveClaim(mergedList[0]);
          setActiveClaimId(mergedList[0].id);
          try {
            localStorage.setItem("bpjs_active_claim_id", mergedList[0].id);
            localStorage.setItem("bpjs_active_claim", JSON.stringify(mergedList[0]));
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn("Using local persistent claims store:", e);
    }
  };

  const selectClaim = (claimId: string, claimData?: Claim) => {
    setActiveClaimId(claimId);
    localStorage.setItem("bpjs_active_claim_id", claimId);
    
    if (claimData) {
      setActiveClaim(claimData);
      try { localStorage.setItem("bpjs_active_claim", JSON.stringify(claimData)); } catch {}
      
      setClaims(prev => {
        const exists = prev.some(c => c.id === claimData.id);
        const updated = exists ? prev.map(c => c.id === claimData.id ? { ...c, ...claimData } : c) : [claimData, ...prev];
        try { localStorage.setItem("bpjs_claims_store", JSON.stringify(updated)); } catch {}
        return updated;
      });
    } else {
      const found = claims.find(c => c.id === claimId);
      if (found) {
        setActiveClaim(found);
        try { localStorage.setItem("bpjs_active_claim", JSON.stringify(found)); } catch {}
      }
    }
  };

  const clearActiveClaim = () => {
    setActiveClaimId(null);
    setActiveClaim(null);
    localStorage.removeItem("bpjs_active_claim_id");
    localStorage.removeItem("bpjs_active_claim");
  };

  return (
    <ClaimContext.Provider value={{ activeClaimId, activeClaim, claims, selectClaim, clearActiveClaim, refreshClaims: fetchClaims }}>
      {children}
    </ClaimContext.Provider>
  );
};

export const useClaimContext = () => useContext(ClaimContext);
