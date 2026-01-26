import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import api from "../api";
import Button from "../components/ui/Button";

// Reusable input component with floating label UI
// 플로팅 라벨 UI가 적용된 재사용 가능한 입력 컴포넌트
const FloatingInput = ({ label, id, error, className, ...props }) => (
  <div className={`relative ${className || ""}`}>
    <input
      id={id}
      {...props}
      placeholder=" "
      className={`
        peer w-full h-12 px-3 pt-3 pb-1 rounded-md border bg-white outline-none transition-all
        disabled:opacity-50 disabled:bg-slate-50 placeholder-transparent
        ${
          error
            ? "border-destructive focus:ring-2 focus:ring-destructive/20"
            : "border-input focus:border-primary focus:ring-2 focus:ring-primary/20"
        }
      `}
    />
    <label
      htmlFor={id}
      className={`
        absolute left-3 top-3.5 z-10 origin-left -translate-y-4 scale-75 transform cursor-text bg-white px-1 duration-200 
        peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:top-3.5
        peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:scale-75 peer-focus:font-semibold
        peer-[:not(:placeholder-shown)]:-top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:scale-75
        ${
          error
            ? "text-destructive peer-focus:text-destructive"
            : "text-muted-foreground peer-focus:text-primary"
        }
      `}
    >
      {label}
    </label>
    {error && typeof error === "string" && error.trim() !== "" && (
      <p className="text-xs text-destructive mt-1 font-medium ml-1">{error}</p>
    )}
  </div>
);

// Password Reset Confirmation Page
// 비밀번호 재설정 확인 및 변경 페이지
export default function PasswordResetConfirm() {
  
  // Extract UID and Token from URL (Sent via Email)
  // 이메일로 전달된 URL에서 UID와 토큰 추출
  const { uid, token } = useParams();
  const navigate = useNavigate();

  // State management for inputs and UI status
  // 입력값 및 UI 상태 관리
  const [newPassword1, setNewPassword1] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle input change: Update state & clear field errors
  // 입력 변경 처리: 상태 업데이트 및 필드 에러 초기화
  const handleInputChange = (setter, fieldName) => (e) => {
    setter(e.target.value);
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: null }));
    }
    if (globalError) setGlobalError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    const newErrors = {};
    if (!newPassword1) newErrors.newPassword1 = "새 비밀번호를 입력해주세요.";
    if (!newPassword2)
      newErrors.newPassword2 = "새 비밀번호 확인을 입력해주세요.";

    // Frontend Validation: Complexity Check (Upper + Special + 8 chars)
    // 프론트엔드 유효성 검사: 복잡성 확인 (대문자 + 특수문자 + 8자)
    if (newPassword1) {
      const hasUpperCase = /[A-Z]/.test(newPassword1);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword1);
      if (newPassword1.length < 8 || !hasUpperCase || !hasSpecialChar) {
        newErrors.newPassword1 =
          "영문 대문자, 특수문자 포함 8자 이상이어야 합니다.";
        if (newPassword2) newErrors.newPassword2 = newErrors.newPassword1;
      }
    }

    // Frontend Validation: Password Mismatch Check
    // 프론트엔드 유효성 검사: 비밀번호 불일치 확인
    if (!newErrors.newPassword1 && newPassword1 !== newPassword2) {
      newErrors.newPassword2 = "비밀번호가 일치하지 않습니다.";
    }

    // Stop submission if validation fails
    // 유효성 검사 실패 시 제출 중단
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const cleanUid = uid ? uid.trim() : "";
      const cleanToken = token ? token.trim() : "";

      // Send Reset Request to Backend
      // 백엔드에 재설정 요청 전송
      await api.post("/api/auth/password/reset/confirm/", {
        uid: cleanUid,
        token: cleanToken,
        new_password1: newPassword1,
        new_password2: newPassword2,
      });

      // Security: Clear stale session/auth data on success
      // 보안: 성공 시 오래된 세션/인증 데이터 제거
      localStorage.removeItem("user_info");
      localStorage.removeItem("is_logged_in");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");

      setIsSuccess(true);
    } catch (err) {
      console.error(err);

      // Error Handling: Invalid link or expired token
      // 에러 처리: 유효하지 않은 링크 또는 만료된 토큰
      if (err.response?.data?.detail) {
        setGlobalError("유효하지 않은 링크이거나 만료되었습니다.");
      } else if (err.response?.data?.token) {
        setGlobalError("이미 사용된 링크이거나 유효하지 않습니다.");
      } else {
        setGlobalError("비밀번호 변경에 실패했습니다. 다시 시도해주세요.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-white/20">
        
        {/* Success View */}
        {/* 성공 화면 */}
        {isSuccess ? (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
              <LucideIcons.CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-[#4a7a78] mb-2">
              비밀번호 변경 완료
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              비밀번호가 성공적으로 변경되었습니다.
              <br />
              새로운 비밀번호로 로그인해주세요.
            </p>
            <Button
              onClick={() => {

                // Double check: Clear storage before navigating
                // 재확인: 이동 전 스토리지 초기화
                localStorage.removeItem("user_info");
                localStorage.removeItem("is_logged_in");
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                navigate("/login");
              }}
              className="w-full h-12 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              로그인 화면으로
            </Button>
          </div>
        ) : (
            
          /* Input Form View */
          /* 입력 폼 화면 */
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              비밀번호 재설정
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              새로운 비밀번호로 비밀번호를 재설정해주세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <FloatingInput
                id="new-pw1"
                type="password"
                label="새 비밀번호"
                value={newPassword1}
                onChange={handleInputChange(setNewPassword1, "newPassword1")}
                error={errors.newPassword1}
                autoComplete="off"
              />
              <FloatingInput
                id="new-pw2"
                type="password"
                label="새 비밀번호 확인"
                value={newPassword2}
                onChange={handleInputChange(setNewPassword2, "newPassword2")}
                error={errors.newPassword2}
                autoComplete="off"
              />
              <Button
                type="submit"
                className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
                isLoading={isLoading}
              >
                비밀번호 변경
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
