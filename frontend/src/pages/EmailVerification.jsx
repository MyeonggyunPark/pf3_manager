import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import Button from "../components/ui/Button";

// Email verification page component
// 이메일 인증 페이지 컴포넌트
export default function EmailVerification() {

  // Retrieve verification key from URL parameters
  // URL 파라미터에서 인증 키 추출
  const { key } = useParams();
  const navigate = useNavigate();

  // Manage UI status state (verifying, success, fail)
  // UI 상태 관리 (진행 중, 성공, 실패)
  const [status, setStatus] = useState("verifying");

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

  // Execute verification logic on component mount
  // 컴포넌트 마운트 시 인증 로직 실행
  useEffect(() => {
    const verifyEmail = async () => {

      // Validate key existence
      // 인증 키 존재 여부 검증
      if (!key) {
        setStatus("fail");
        return;
      }

      try {

        // Send verification request to API
        // API에 인증 요청 전송
        await api.post("/api/auth/registration/verify-email/", { key: key });
        setStatus("success");
      } catch (err) {

        // Handle verification errors
        // 인증 실패 에러 처리
        console.error(err);
        setStatus("fail");
      }
    };

    verifyEmail();
  }, [key]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-card rounded-2xl shadow-xl p-8 text-center border border-slate-100 dark:border-border transition-all">
        {/* Loading State UI */}
        {/* 로딩 상태 UI */}
        {status === "verifying" && (
          <div>
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-foreground">
              인증 확인 중...
            </h2>
            <p className="text-slate-400 dark:text-muted-foreground mt-2">
              잠시만 기다려주세요.
            </p>
          </div>
        )}

        {/* Success State UI */}
        {/* 인증 성공 UI */}
        {status === "success" && (
          <div>
            <div className="w-16 h-16 bg-accent/20 dark:bg-accent/10 text-[#4a7a78] dark:text-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#4a7a78] dark:text-accent mb-2">
              이메일 인증 성공
            </h2>
            <p className="text-slate-400 dark:text-muted-foreground mb-6">
              계정이 활성화되었습니다.
              <br />
              이제 로그인할 수 있습니다.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              로그인 화면으로
            </Button>
          </div>
        )}

        {/* Failure State UI */}
        {/* 인증 실패 UI */}
        {status === "fail" && (
          <div>
            <div className="w-16 h-16 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">
              인증 실패
            </h2>
            <p className="text-slate-400 dark:text-muted-foreground mb-6">
              유효하지 않거나 만료된 링크입니다.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
            >
              로그인 화면으로
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
