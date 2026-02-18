import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../api";
import { cn } from "../lib/utils";
import Button from "../components/ui/Button";
  
// Reusable Floating Input Component
// 재사용 가능한 플로팅 입력 컴포넌트
const FloatingInput = ({
  label,
  id,
  error,
  className,
  variant = "primary",
  ...props
}) => {
  // Define color styles based on variant
  // 변형(variant)에 따른 색상 스타일 정의
  const colorStyles = {
    primary: {
      input: "focus:border-primary focus:ring-primary/20",
      label: "peer-focus:text-primary",
    },
    accent: {
      input: "focus:border-accent focus:ring-accent/20",
      label: "peer-focus:text-accent",
    },
  };

  const activeStyle = colorStyles[variant] || colorStyles.primary;

  return (
    <div className={`relative ${className || ""}`}>
      <input
        id={id}
        {...props}
        placeholder=" "
        className={`
          peer w-full h-12 px-3 pt-3 pb-1 rounded-md border bg-white outline-none transition-all
          disabled:opacity-50 disabled:bg-slate-50 placeholder-transparent
          dark:bg-card dark:border-border dark:text-foreground
          ${
            error
              ? "border-destructive focus:ring-2 focus:ring-destructive/20"
              : `border-input focus:ring-2 ${activeStyle.input}`
          }
        `}
      />
      {/* Floating Label Animation UI */}
      {/* 플로팅 라벨 애니메이션 UI */}
      <label
        htmlFor={id}
        className={`
          absolute left-3 top-3.5 z-10 origin-left -translate-y-4 scale-75 transform cursor-text bg-white px-1 duration-200 
          peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:top-3.5
          peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:scale-75 peer-focus:font-semibold
          peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-75
          dark:bg-card dark:text-muted-foreground
          ${
            error
              ? "text-destructive peer-focus:text-destructive"
              : `text-muted-foreground ${activeStyle.label}`
          }
        `}
      >
        {label}
      </label>
      {error && typeof error === "string" && error.trim() !== "" && (
        <p className="text-xs text-destructive mt-1 font-medium ml-1 animate-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
};

// Forgot Password Modal using Portal
// Portal을 사용한 비밀번호 찾기 모달
const ForgotPasswordModal = ({ isOpen, onClose }) => {

  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  // Reset state when modal opens
  // 모달 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setError("");
      setIsSent(false);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setEmail(e.target.value);
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("auth_error_email_required"));
      return;
    }

    setIsLoading(true);

    try {
      // Request password reset email
      // 비밀번호 재설정 이메일 요청
      await api.post("/api/auth/password/reset/", { email });
      setIsSent(true);
    } catch (err) {
      console.error(err);
      setError(t("auth_error_account_not_found"));
    } finally {
      setIsLoading(false);
    }
  };

  // Render outside parent DOM hierarchy
  // 부모 DOM 계층 구조 외부에서 렌더링
  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 hover:bg-slate-100 dark:hover:bg-muted text-slate-400 hover:text-slate-600 dark:hover:text-foreground transition-colors cursor-pointer p-2 rounded-full"
        >
          <LucideIcons.X className="w-5 h-5" />
        </button>

        {!isSent ? (
          <>
            <h3 className="text-xl font-bold text-slate-800 dark:text-foreground mb-2">
              {t("auth_forgot_title")}
            </h3>
            <p className="text-slate-400 dark:text-muted-foreground text-sm mb-6">
              {t("auth_forgot_desc_line1")}
              <br />
              {t("auth_forgot_desc_line2")}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FloatingInput
                id="reset-email"
                type="email"
                label={t("auth_input_email")}
                value={email}
                onChange={handleInputChange}
                error={error}
                required
                autoComplete="off"
              />
              <Button
                type="submit"
                className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
                isLoading={isLoading}
              >
                {t("auth_forgot_send_mail")}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-accent/20 text-[#4a7a78] dark:text-accent-foreground rounded-full flex items-center justify-center mb-4">
              <LucideIcons.MailCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#4a7a78] dark:text-accent-foreground mb-2">
              {t("auth_forgot_sent_title")}
            </h3>
            <p className="text-slate-400 dark:text-muted-foreground text-sm mb-6">
              <strong>{email}</strong>
              {t("auth_forgot_sent_to")}
              <br />
              {t("auth_forgot_sent_desc_line1")}
              <br />
              {t("auth_forgot_sent_desc_line2")}
            </p>
            <Button
              onClick={onClose}
              className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              {t("auth_back_to_login")}
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};;

// Social Login Button Group
// 소셜 로그인 버튼 그룹
const SocialLoginButtons = () => {
  const handleSocialLogin = (provider) => {
    // Redirect to backend social login endpoint
    // 백엔드 소셜 로그인 엔드포인트로 리다이렉트
    const baseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
    window.location.href = `${baseUrl}/accounts/${provider}/login/`;
  };

  return (
    <div className="flex gap-3 w-full mt-6">
      <button
        type="button"
        onClick={() => handleSocialLogin("google")}
        className="flex-1 flex items-center justify-center gap-2 h-10 border-2 border-muted-foreground/30 rounded-lg transition-all bg-white dark:bg-card shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-105 cursor-pointer"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        <span className="text-sm font-medium text-slate-800 dark:text-foreground">
          Google
        </span>
      </button>
      <button
        type="button"
        onClick={() => handleSocialLogin("kakao")}
        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg transition-all border-2 border-yellow-300 bg-[#FEE500] shadow-md shadow-primary/20 hover:shadow-primary/30 hover:scale-105 cursor-pointer   "
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#000000">
          <path d="M12 3C5.9 3 1 6.9 1 11.8c0 3.3 2.2 6.2 5.6 7.6-.1.6-.4 2.3-.5 2.6 0 0-.1.2.1.3.1.1.3.1.5 0 .3-.2 3.1-2.1 4.3-2.9.3 0 .7.1 1 .1 6.1 0 11-3.9 11-8.8C23 6.9 18.1 3 12 3z" />
        </svg>
        <span className="text-sm font-medium text-slate-800">Kakao</span>
      </button>
    </div>
  );
};

// Custom Hook to check for screen size
// 화면 크기를 확인하기 위한 커스텀 훅
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);

    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [query]);

  return matches;
};

// Main Auth Page Component (Login + Signup)
// 메인 인증 페이지 컴포넌트 (로그인 + 회원가입)
const AuthPage = ({ onLogin }) => {

  // Translation hook for localized UI text
  // 다국어 UI 텍스트를 위한 번역 훅
  const { t, i18n } = useTranslation();

  // Language condition for style branching
  // 언어별 스타일 분기 조건
  const isGerman = i18n?.resolvedLanguage?.startsWith("de") || false;

  const textLogIn = t("auth_login_title");
  const textSignUp = t("auth_signup_title");
  const textOrContinueWith = t("auth_or_continue_with");
  const textOrJoinWith = t("auth_or_join_with");
  const textNewHere = t("auth_new_here");
  const textWelcome = t("auth_welcome_back_line1");
  const textBack = t("auth_welcome_back_line2");

  // Check if device is desktop (min-width: 768px)
  // 데스크탑 장치 확인 (최소 너비: 768px)
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // State for Flip Animation (True = Signup, False = Login)
  // 플립 애니메이션 상태 (True = 회원가입, False = 로그인)
  const [isFlipped, setIsFlipped] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Login Form States
  // 로그인 폼 상태
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loginErrors, setLoginErrors] = useState({});
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup Form States
  // 회원가입 폼 상태
  const [signupData, setSignupData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [signupGlobalError, setSignupGlobalError] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);

  // Remember Email State
  // 이메일 기억하기 상태
  const [rememberEmail, setRememberEmail] = useState(false);

  // Theme synchronization logic for pre-login pages
  // 로그인 전 페이지를 위한 테마 동기화 로직
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Check Local Storage for Saved Email
  // 로컬 스토리지에서 저장된 이메일 확인
  useEffect(() => {
    const savedEmail = localStorage.getItem("saved_email");
    if (savedEmail) {
      setLoginData((prev) => ({ ...prev, email: savedEmail }));
      setRememberEmail(true);
    }
  }, []);

  // Switch to Login Mode
  // 로그인 모드로 전환
  const handleSwitchToLogin = () => {
    setIsFlipped(false);
    setSignupData({ email: "", password: "", passwordConfirm: "" });
    setSignupErrors({});
    setSignupGlobalError("");
  };

  // Switch to Signup Mode
  // 회원가입 모드로 전환
  const handleSwitchToSignup = () => {
    setIsFlipped(true);
    setLoginData({ email: "", password: "" });
    setLoginErrors({});
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name])
      setLoginErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Handle Login Submission
  // 로그인 제출 처리
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginErrors({});

    localStorage.removeItem("user_info");
    localStorage.removeItem("is_logged_in");

    try {
      const response = await api.post("/api/auth/login/", loginData);

      // Handle 'Remember Me'
      // '아이디 기억하기' 처리
      if (rememberEmail) {
        localStorage.setItem("saved_email", loginData.email);
      } else {
        localStorage.removeItem("saved_email");
      }

      // Store User Info & Session Flag
      // 사용자 정보 및 세션 플래그 저장
      const userInfo = {
        name: response.data.user?.name || loginData.email.split("@")[0],
        email: loginData.email,
        pk: response.data.user?.pk,
      };

      localStorage.setItem("user_info", JSON.stringify(userInfo));
      localStorage.setItem("is_logged_in", "true");

      onLogin(userInfo);
    } catch (err) {
      console.error(err);
      setLoginErrors({
        email: " ",
        password: t("auth_error_login_invalid"),
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData((prev) => ({ ...prev, [name]: value }));
    if (signupErrors[name])
      setSignupErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Handle Signup Submission
  // 회원가입 제출 처리
  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupErrors({});
    setSignupGlobalError("");

    const newErrors = {};
    const { email, password, passwordConfirm } = signupData;

    // Frontend Validation
    // 프론트엔드 유효성 검사
    if (!email.trim()) newErrors.email = t("auth_error_email_required");
    if (!password)
      newErrors.password = t("auth_error_signup_password_required");
    if (!passwordConfirm)
      newErrors.passwordConfirm = t(
        "auth_error_signup_password_confirm_required",
      );

    // Password Complexity Check (Upper + Special + 8 chars)
    // 비밀번호 복잡성 검사 (대문자 + 특수문자 + 8자)
    if (password) {
      const hasUpperCase = /[A-Z]/.test(password);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      const isValidLength = password.length >= 8;
      if (!isValidLength || !hasUpperCase || !hasSpecialChar) {
        const msg = t("auth_error_password_rule");
        newErrors.password = msg;
        if (passwordConfirm) newErrors.passwordConfirm = msg;
      }
    }

    if (
      !newErrors.password &&
      password &&
      passwordConfirm &&
      password !== passwordConfirm
    ) {
      newErrors.passwordConfirm = t("auth_error_password_mismatch");
    }

    if (Object.keys(newErrors).length > 0) {
      setSignupErrors(newErrors);
      return;
    }

    setSignupLoading(true);

    try {
      const generatedUsername = email.split("@")[0];

      // Request Account Creation
      // 계정 생성 요청
      await api.post("/api/auth/registration/", {
        username: generatedUsername,
        name: generatedUsername,
        email: email,
        password1: password,
        password2: passwordConfirm,
      });
      setSignupSuccess(true);
    } catch (err) {
      // Handle Field-Specific or Global Errors
      // 필드별 또는 전역 에러 처리
      if (
        err.response?.data &&
        typeof err.response.data === "object" &&
        !err.response.data.detail
      ) {
        const fieldErrors = {};
        Object.keys(err.response.data).forEach((key) => {
          fieldErrors[key] = Array.isArray(err.response.data[key])
            ? err.response.data[key][0]
            : err.response.data[key];
        });
        setSignupErrors(fieldErrors);
      } else {
        setSignupGlobalError(t("auth_error_signup_failed"));
      }
    } finally {
      setSignupLoading(false);
    }
  };

  const handleConfirmSuccess = () => {
    setSignupSuccess(false);
    setIsFlipped(false);
    setLoginData({ ...loginData, email: signupData.email });
    setSignupData({ email: "", password: "", passwordConfirm: "" });
  };

  // Determine transform style based on device and flip state
  // 장치 및 플립 상태에 따른 transform 스타일 결정
  const getTransformStyle = () => {
    if (isDesktop) {
      // Desktop: Flip on Y axis (Left/Right)
      // 데스크탑: Y축 기준 플립 (좌/우)
      return isFlipped ? "rotateY(-180deg)" : "rotateY(0deg)";
    }
    // Mobile: Flip on X axis (Top/Bottom)
    // 모바일: X축 기준 플립 (상/하)
    return isFlipped ? "rotateX(180deg)" : "rotateX(0deg)";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-0 md:p-4 overflow-hidden font-sans transition-colors duration-300">
      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />

      {/* Signup Success Modal */}
      {/* 회원가입 성공 모달 */}
      {signupSuccess && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-card rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mb-4">
              <LucideIcons.MailCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#4a7a78] dark:text-accent-foreground mb-2">
              {t("auth_signup_success_title")}
            </h3>
            <p className="text-slate-400 dark:text-muted-foreground text-center mb-6 text-sm font-medium">
              {t("auth_signup_success_desc_line1")}
              <br />
              {t("auth_signup_success_desc_line2")}
            </p>
            <Button
              onClick={handleConfirmSuccess}
              className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              {t("auth_back_to_login")}
            </Button>
          </div>
        </div>
      )}

      {/* 3D Flip Card Container */}
      {/* 3D 플립 카드 컨테이너 */}
      <div
        className="relative w-full h-screen md:h-155 md:w-full md:max-w-210 flex flex-col md:flex-row bg-white dark:bg-card rounded-none md:rounded-2xl shadow-none md:shadow-2xl overflow-hidden"
        style={{ perspective: "2000px" }}
      >
        {/* [Front Side] Login Form Section */}
        {/* [앞면] 로그인 폼 섹션 */}
        <div className="flex-1 w-full h-1/2 md:h-full md:w-1/2 p-6 md:p-10 flex flex-col items-center justify-center md:pt-16 relative z-0">
          <div className="absolute top-4 left-6 md:top-6 md:left-8 flex items-center gap-2">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex justify-center items-center border-3 border-muted-foreground/10 dark:bg-slate-200">
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-9 h-9 md:w-11 md:h-11"
              />
            </div>
            <h1 className="text-lg md:text-xl font-bold text-primary">
              MS Planer
            </h1>
          </div>

          <div className="w-full max-w-sm mt-4 md:mt-8 scale-90 md:scale-100 origin-top">
            <div className="mb-4 md:mb-8 text-center">
              <h2 className="text-3xl text-end sm:text-center md:text-4xl font-black text-primary tracking-tight uppercase">
                {textLogIn}
              </h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-4">
                <FloatingInput
                  id="login-email"
                  type="email"
                  name="email"
                  label={t("auth_input_email")}
                  value={loginData.email}
                  onChange={handleLoginChange}
                  error={loginErrors.email}
                  required
                  autoComplete="off"
                />
                <FloatingInput
                  id="login-password"
                  type="password"
                  name="password"
                  label={t("auth_input_password")}
                  value={loginData.password}
                  onChange={handleLoginChange}
                  error={loginErrors.password}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 border-2 border-slate-300 rounded-sm transition-all peer-checked:bg-primary peer-checked:border-primary group-hover:border-primary/50"></div>
                    <svg
                      className="absolute top-0.5 left-0.5 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <span className="text-xs text-muted-foreground group-hover:text-primary group-hover:font-semibold select-none">
                    {t("auth_remember_email")}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-muted-foreground hover:text-primary hover:font-semibold transition-colors cursor-pointer"
                >
                  {t("auth_forgot_password")}
                </button>
              </div>

              <Button
                type="submit"
                className="w-full h-11 md:h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
                variant="primary"
                isLoading={loginLoading}
              >
                {t("auth_login_button")}
              </Button>
            </form>

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-card px-2 text-muted-foreground">
                  {textOrContinueWith}
                </span>
              </div>
            </div>
            <SocialLoginButtons />
          </div>
        </div>

        {/* [Back Side] Signup Form Section */}
        {/* [뒷면] 회원가입 폼 섹션 */}
        <div className="flex-1 w-full h-1/2 md:h-full md:w-1/2 p-6 md:p-10 flex flex-col items-center justify-center md:pt-16 relative z-0 bg-[#f9fafb] dark:bg-card/50">
          <div className="absolute top-4 right-6 md:top-6 md:right-8 flex items-center gap-2">
            <h1 className="text-lg md:text-xl font-bold text-accent">
              MS Planer
            </h1>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg flex justify-center items-center border-3 border-muted-foreground/10 dark:bg-slate-200">
              <img
                src="/logo.svg"
                alt="Logo"
                className="w-9 h-9 md:w-11 md:h-11"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <LucideIcons.UserPlus className="w-5 h-5 md:w-6 md:h-6 hidden text-accent" />
            </div>
          </div>

          <div className="w-full max-w-sm mt-4 md:mt-8 scale-90 md:scale-100 origin-top">
            <div className="mb-4 md:mb-8 text-center">
              <h2 className="text-3xl text-start sm:text-center md:text-4xl font-black text-accent tracking-tight uppercase">
                {textSignUp}
              </h2>
            </div>

            <form onSubmit={handleSignup} className="space-y-3" noValidate>
              {signupGlobalError && (
                <div className="p-3 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/10 font-medium text-center animate-in slide-in-from-top-2">
                  {signupGlobalError}
                </div>
              )}

              <FloatingInput
                id="signup-email"
                type="email"
                name="email"
                label={t("auth_input_email")}
                value={signupData.email}
                onChange={handleSignupChange}
                error={signupErrors.email}
                variant="accent"
                required
                autoComplete="off"
              />
              <FloatingInput
                id="signup-password"
                type="password"
                name="password"
                label={t("auth_input_password")}
                value={signupData.password}
                onChange={handleSignupChange}
                error={signupErrors.password}
                variant="accent"
                autoComplete="off"
              />
              <FloatingInput
                id="signup-confirm"
                type="password"
                name="passwordConfirm"
                label={t("auth_input_password_confirm")}
                value={signupData.passwordConfirm}
                onChange={handleSignupChange}
                error={signupErrors.passwordConfirm}
                variant="accent"
                autoComplete="off"
              />

              <Button
                type="submit"
                variant="default"
                className="w-full h-11 md:h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
                isLoading={signupLoading}
              >
                {t("auth_signup_button")}
              </Button>
            </form>

            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200 dark:border-border"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#f9fafb] dark:bg-[#1a202c] px-2 text-muted-foreground">
                  {textOrJoinWith}
                </span>
              </div>
            </div>
            <SocialLoginButtons />
          </div>
        </div>

        {/* Animated Overlay for Mode Switching */}
        {/* 모드 전환을 위한 애니메이션 오버레이 */}
        <div
          className={`absolute bottom-0 md:top-0 md:right-0 w-full h-1/2 md:w-1/2 md:h-full z-50 transition-transform duration-1000 ease-in-out`}
          style={{
            transformOrigin: isDesktop ? "left" : "top", // Desktop: left edge, Mobile: top edge
            transformStyle: "preserve-3d",
            transform: getTransformStyle(),
          }}
        >
          {/* Overlay: Signup Promo (Shows when Login form is active) */}
          {/* 로그인 폼이 활성화될 때 표시되는 오버레이: 회원가입 프로모션 */}
          <div
            className="absolute inset-0 bg-accent dark:bg-secondary flex flex-col items-center justify-center p-6 md:p-12 text-white backface-hidden shadow-[0_-10px_30px_rgba(0,0,0,0.2)] md:shadow-[-10px_0_30px_rgba(0,0,0,0.2)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <LucideIcons.UserPlus className="w-12 h-12 md:w-20 md:h-20 mb-4 md:mb-6 opacity-80 dark:text-accent" />
            <h2 className="text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter uppercase">
              {textNewHere}
            </h2>
            <p className="text-center mb-6 md:mb-12 opacity-90 leading-relaxed font-medium text-sm md:text-base">
              {t("auth_overlay_signup_desc_line1")}
              <br className="hidden md:block" />
              {t("auth_overlay_signup_desc_line2")}
            </p>
            <Button
              onClick={handleSwitchToSignup}
              className="bg-card dark:bg-card text-accent border-3 hover:text-card hover:scale-105 w-36 h-11 md:w-48 md:h-14 text-sm md:text-lg rounded-full shadow-2xl uppercase cursor-pointer"
            >
              {textSignUp}
            </Button>
          </div>

          {/* Overlay: Login Promo (Shows when Signup form is active) */}
          {/* 회원가입 폼이 활성화될 때 표시되는 오버레이: 로그인 프로모션 */}
          <div
            className="absolute inset-0 bg-primary dark:bg-muted flex flex-col items-center justify-center p-6 md:p-12 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] md:shadow-[10px_0_30px_rgba(0,0,0,0.2)]"
            style={{
              backfaceVisibility: "hidden",
              transform: isDesktop ? "rotateY(180deg)" : "rotateX(180deg)",
            }}
          >
            <LucideIcons.LogIn className="w-12 h-12 md:w-20 md:h-20 mb-4 md:mb-6 opacity-80 dark:text-primary" />
            <h2
              className={cn(
                "text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter uppercase",
                isGerman ? "hidden" : "block",
              )}
            >
              {textWelcome} {textBack}
            </h2>

            <h2
              className={cn(
                "text-2xl text-center md:text-4xl font-black mb-2 md:mb-4 tracking-tighter uppercase",
                isGerman ? "block" : "hidden",
              )}
            >
              <p>{textWelcome}</p>
              <p>{textBack}</p>
            </h2>

            <p className="text-center mb-6 md:mb-12 opacity-90 leading-relaxed font-medium text-sm md:text-base">
              {t("auth_overlay_login_desc_line1")}
              <br className="hidden md:block" />
              {t("auth_overlay_login_desc_line2")}
            </p>
            <Button
              onClick={handleSwitchToLogin}
              className="bg-card dark:bg-card text-primary border-3 hover:bg-primary hover:text-card hover:scale-105 w-36 h-11 md:w-48 md:h-14 font-bold text-sm md:text-lg rounded-full shadow-2xl transition-all uppercase cursor-pointer"
            >
              {textLogIn}
            </Button>
          </div>
        </div>
        <div className="absolute hidden md:block left-1/2 top-0 bottom-0 w-1 bg-linear-to-r from-black/10 via-transparent to-black/10 z-60"></div>
      </div>
    </div>
  );
};;

export default AuthPage;
