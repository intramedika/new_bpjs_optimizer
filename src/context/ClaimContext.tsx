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
      const res = await fetch(`/api/claims?dataMode=ALL`);
      const data = await res.json();
      const apiList: Claim[] = Array.isArray(data) ? data : (data.claims || []);

      // Merge API claims with browser persistent claims store
      const mergedList = [...apiList];
      claims.forEach(c => {
        if (c && c.id && !mergedList.some(m => m.id === c.id)) {
          mergedList.unshift(c);
        }
      });

      setClaims(mergedList);
      try {
        localStorage.setItem("bpjs_claims_store", JSON.stringify(mergedList));
      } catch (e) {}

      if (mergedList.length > 0) {
        const currentId = localStorage.getItem("bpjs_active_claim_id") || activeClaimId;
        const found = mergedList.find((c: Claim) => c.id === currentId) || mergedList[0];
        setActiveClaim(found);
        setActiveClaimId(found.id);
        localStorage.setItem("bpjs_active_claim_id", found.id);
        try { localStorage.setItem("bpjs_active_claim", JSON.stringify(found)); } catch {}
      }
    } catch (e) {
      console.error("Failed to fetch claims in ClaimContext:", e);
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
