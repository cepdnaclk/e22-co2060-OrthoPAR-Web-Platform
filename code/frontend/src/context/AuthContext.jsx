import { createContext, useContext, useState, useEffect } from "react";
import { getMe, logout as apiLogout } from "../utils/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { id, email, full_name }
  const [loading, setLoading] = useState(true);  // true while checking stored token

  // On mount: if a token exists, validate it by fetching /users/me
  useEffect(() => {
    const token = localStorage.getItem("orthopar_token");
    if (!token) { setLoading(false); return; }

    getMe()
      .then(setUser)
      .catch(() => {
        // Token is expired or invalid — clear it
        localStorage.removeItem("orthopar_token");
      })
      .finally(() => setLoading(false));
  }, []);

  function login(userData) {
    setUser(userData);
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  function updateUser(userData) {
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
