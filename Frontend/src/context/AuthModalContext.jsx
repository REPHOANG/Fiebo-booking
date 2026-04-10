import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LoginPopup from "../components/common/LoginPopup/LoginPopup";
import RegisterPopup from "../components/common/RegisterPopup/RegisterPopup";
import { lockBodyScroll, unlockBodyScroll } from "../utils/bodyScrollLock";

const AuthModalContext = createContext(null);

/** State key trên `location.state` để mở popup sau khi điều hướng về trang chủ. */
export const OPEN_AUTH_STATE_KEY = "openAuth";

export function AuthModalProvider({ children }) {
  const [active, setActive] = useState(null); // 'login' | 'register' | null
  const [redirectAfterLogin, setRedirectAfterLogin] = useState("");
  const location = useLocation();

  const openLogin = useCallback(
    (options = {}) => {
      const redirectTo =
        typeof options?.redirectTo === "string" && options.redirectTo.startsWith("/")
          ? options.redirectTo
          : `${location.pathname}${location.search}${location.hash}`;
      setRedirectAfterLogin(redirectTo);
      setActive("login");
    },
    [location.pathname, location.search, location.hash],
  );
  const openRegister = useCallback(() => setActive("register"), []);
  const closeAuthModal = useCallback(() => {
    setActive(null);
    setRedirectAfterLogin("");
  }, []);

  useEffect(() => {
    if (!active) return;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
    };
  }, [active]);

  const value = useMemo(
    () => ({ openLogin, openRegister, closeAuthModal, active }),
    [openLogin, openRegister, closeAuthModal, active],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <LoginPopup
        open={active === "login"}
        onClose={closeAuthModal}
        onOpenRegister={() => setActive("register")}
        redirectAfterLogin={redirectAfterLogin}
      />
      <RegisterPopup
        open={active === "register"}
        onClose={closeAuthModal}
        onOpenLogin={() => setActive("login")}
      />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}

/**
 * Đồng bộ `location.state.openAuth` → mở popup, rồi xóa flag khỏi history (giữ các field state khác).
 */
export function AuthModalRouteSync() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openLogin, openRegister } = useAuthModal();
  const openAuth = location.state?.[OPEN_AUTH_STATE_KEY];
  const redirectTo = location.state?.redirectTo;

  useEffect(() => {
    if (openAuth !== "login" && openAuth !== "register") return;

    if (openAuth === "login") openLogin({ redirectTo });
    else openRegister();

    const { [OPEN_AUTH_STATE_KEY]: _removed, redirectTo: _removedRedirect, ...rest } = location.state || {};
    const hasRest = Object.keys(rest).length > 0;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: hasRest ? rest : {},
    });
  }, [openAuth, redirectTo, location.pathname, location.search, navigate, openLogin, openRegister]);

  return null;
}
