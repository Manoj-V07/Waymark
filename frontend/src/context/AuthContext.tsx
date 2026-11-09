"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserProfile, UserRole } from "@/types";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  quickSwitchDemoRole: (role: UserRole) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Preset demo accounts configured for quick testing & SIH evaluation
export const DEMO_USERS: Record<UserRole, { email: string; name: string; institution_id?: string; description: string }> = {
  AICTE_HQ: {
    email: "admin@aicte.gov.in",
    name: "Dr. Rajeshwar Sharma (Director, Regulation Bureau)",
    description: "Full regulatory oversight, national approvals, penalty ratification, rule configuration.",
  },
  INSTITUTION_NODAL: {
    email: "nodal@coep.ac.in",
    name: "Prof. Ananya Kulkarni (COEP Nodal Officer)",
    institution_id: "inst-001",
    description: "Student data ingestion, quota compliance evaluation, regulatory dispute response.",
  },
  STUDENT: {
    email: "student@coep.ac.in",
    name: "Aarav Sharma (B.Tech Mechanical)",
    institution_id: "inst-001",
    description: "APAAR ID Card, admission confirmation status, ABC digital credits consent.",
  },
  VERIFIER: {
    email: "hr.verify@tcs.com",
    name: "Vikram Malhotra (TCS Corporate HR & Credential Verifier)",
    description: "Third-party instant verification of APAAR ID, academic status, and AICTE approval integrity.",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Restore session from localStorage if available
    const savedToken = localStorage.getItem("waymark_auth_token");
    const savedUser = localStorage.getItem("waymark_auth_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse saved user", e);
        localStorage.removeItem("waymark_auth_token");
        localStorage.removeItem("waymark_auth_user");
      }
    } else {
      // Default initial session for seamless first-load presentation: AICTE_HQ
      const defaultRole: UserRole = "AICTE_HQ";
      const demo = DEMO_USERS[defaultRole];
      const defaultUser: UserProfile = {
        user_id: `usr-${defaultRole.toLowerCase()}-01`,
        email: demo.email,
        full_name: demo.name,
        role: defaultRole,
        is_active: true,
      };
      const demoToken = `mock-token-${defaultRole.toLowerCase()}-2026`;
      setUser(defaultUser);
      setToken(demoToken);
      localStorage.setItem("waymark_auth_token", demoToken);
      localStorage.setItem("waymark_auth_user", JSON.stringify(defaultUser));
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("waymark_auth_token", newToken);
    localStorage.setItem("waymark_auth_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("waymark_auth_token");
    localStorage.removeItem("waymark_auth_user");
  };

  const quickSwitchDemoRole = async (targetRole: UserRole) => {
    const demo = DEMO_USERS[targetRole];
    const newUser: UserProfile = {
      user_id: `usr-${targetRole.toLowerCase()}-01`,
      email: demo.email,
      full_name: demo.name,
      role: targetRole,
      institution_id: demo.institution_id,
      is_active: true,
    };
    const newToken = `mock-token-${targetRole.toLowerCase()}-2026`;
    login(newToken, newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        logout,
        quickSwitchDemoRole,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

