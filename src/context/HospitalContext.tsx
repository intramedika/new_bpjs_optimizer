import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface Hospital {
  id: string;
  tenantId: string;
  groupId: string;
  name: string;
  code: string;
  status: string;
  timezone?: string;
}

export interface HospitalGroup {
  id: string;
  tenantId: string;
  name: string;
  code: string;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
}

export interface AuthUser {
  userId: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  hospitalId: string;
}

export const PRESET_USERS: AuthUser[] = [
  { userId: "usr-admin-001", name: "Platform Admin", email: "admin@bpjsoptimizer.id", role: "PLATFORM_ADMIN", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" },
  { userId: "usr-casemix-001", name: "Casemix Officer", email: "casemix@hospital-jkt.id", role: "CASEMIX_OFFICER", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" },
  { userId: "usr-coder-001", name: "Coder Casemix", email: "coder@hospital-jkt.id", role: "CODER", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" },
  { userId: "usr-doctor-001", name: "dr. DPJP Sp.PD", email: "dr.dpjp@hospital-jkt.id", role: "CLINICAL_REVIEWER", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" },
  { userId: "usr-hosp-001", name: "Hospital Admin", email: "hospadmin@hospital-jkt.id", role: "HOSPITAL_ADMIN", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" },
  { userId: "usr-audit-001", name: "Auditor BPJS", email: "auditor@bpjs.go.id", role: "AUDITOR", tenantId: "tenant-pt-health", hospitalId: "hospital-jkt" }
];

interface HospitalContextType {
  activeTenant: Tenant;
  activeGroup: HospitalGroup;
  activeHospital: Hospital;
  hospitals: Hospital[];
  currentUser: AuthUser;
  userRole: string;
  isAuthenticated: boolean;
  loading: boolean;
  switchHospital: (hospitalId: string) => void;
  switchUser: (userId: string) => void;
  login: (userId: string) => void;
  logout: () => void;
}

const defaultTenant: Tenant = { id: "tenant-pt-health", name: "PT Health Indonesia", code: "PTHI" };
const defaultGroup: HospitalGroup = { id: "group-nusantara", tenantId: "tenant-pt-health", name: "Nusantara Hospital Group", code: "NHG" };
const defaultHospital: Hospital = { id: "hospital-jkt", tenantId: "tenant-pt-health", groupId: "group-nusantara", name: "RS BPJS Utama Jakarta", code: "RS001", status: "ACTIVE" };

const HospitalContext = createContext<HospitalContextType>({
  activeTenant: defaultTenant,
  activeGroup: defaultGroup,
  activeHospital: defaultHospital,
  hospitals: [defaultHospital],
  currentUser: PRESET_USERS[0],
  userRole: "PLATFORM_ADMIN",
  isAuthenticated: true,
  loading: false,
  switchHospital: () => {},
  switchUser: () => {},
  login: () => {},
  logout: () => {}
});

export const HospitalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeTenant, setActiveTenant] = useState<Tenant>(defaultTenant);
  const [activeGroup, setActiveGroup] = useState<HospitalGroup>(defaultGroup);
  const [activeHospital, setActiveHospital] = useState<Hospital>(defaultHospital);
  const [hospitals, setHospitals] = useState<Hospital[]>([
    defaultHospital,
    { id: "hospital-bks", tenantId: "tenant-pt-health", groupId: "group-nusantara", name: "RS BPJS Bekasi", code: "RS002", status: "ACTIVE" },
    { id: "hospital-bdg", tenantId: "tenant-pt-health", groupId: "group-nusantara", name: "RS BPJS Bandung", code: "RS003", status: "ACTIVE" }
  ]);
  
  const [currentUser, setCurrentUser] = useState<AuthUser>(() => {
    const saved = localStorage.getItem("bpjs_auth_user");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return PRESET_USERS[0];
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem("bpjs_is_authenticated");
    if (savedAuth !== null) {
      return savedAuth === "true";
    }
    return true; // Default logged in for smooth preview
  });

  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchContext();
  }, []);

  const fetchContext = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/hospitals");
      const data = await res.json();
      if (data.hospitals && data.hospitals.length > 0) {
        setHospitals(data.hospitals);
      }
    } catch (e) {
      console.error("Failed to fetch organizational context:", e);
    } finally {
      setLoading(false);
    }
  };

  const switchHospital = (hospitalId: string) => {
    const found = hospitals.find(h => h.id === hospitalId);
    if (found) {
      setActiveHospital(found);
      window.dispatchEvent(new CustomEvent("hospital-changed", { detail: found }));
    }
  };

  const switchUser = (userId: string) => {
    const found = PRESET_USERS.find(u => u.userId === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem("bpjs_auth_user", JSON.stringify(found));
      window.dispatchEvent(new CustomEvent("auth-changed", { detail: found }));
    }
  };

  const login = (userId: string) => {
    const found = PRESET_USERS.find(u => u.userId === userId) || PRESET_USERS[0];
    setCurrentUser(found);
    setIsAuthenticated(true);
    localStorage.setItem("bpjs_is_authenticated", "true");
    localStorage.setItem("bpjs_auth_user", JSON.stringify(found));
    window.dispatchEvent(new CustomEvent("auth-changed", { detail: found }));
  };

  const logout = () => {
    localStorage.setItem("bpjs_is_authenticated", "false");
    localStorage.removeItem("bpjs_auth_user");
    setIsAuthenticated(false);
    sessionStorage.clear();
    window.dispatchEvent(new CustomEvent("auth-changed", { detail: null }));
  };

  return (
    <HospitalContext.Provider
      value={{
        activeTenant,
        activeGroup,
        activeHospital,
        hospitals,
        currentUser,
        userRole: currentUser.role,
        isAuthenticated,
        loading,
        switchHospital,
        switchUser,
        login,
        logout
      }}
    >
      {children}
    </HospitalContext.Provider>
  );
};

export const useHospitalContext = () => useContext(HospitalContext);
