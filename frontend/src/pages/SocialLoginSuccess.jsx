import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Social Login Redirect Handler
// 소셜 로그인 성공 후 처리 핸들러
export default function SocialLoginSuccess() {
  const navigate = useNavigate();

  // Verify session on component mount
  // 컴포넌트 마운트 시 세션 검증 수행
  useEffect(() => {
    const verifyLogin = async () => {
      try {
        console.log("Verifying social login status...");

        // Fetch user data to confirm valid session
        // 사용자 데이터를 조회하여 유효한 세션인지 확인
        const response = await api.get("/api/auth/user/");

        if (response.status === 200) {
          console.log("Login verified successfully!", response.data);

          // Update local storage flags
          // 로컬 스토리지 플래그 업데이트
          localStorage.setItem("is_logged_in", "true");
          localStorage.setItem(
            "user_info",
            JSON.stringify({
              pk: response.data.pk,
              email: response.data.email,
              name: response.data.name,
            }),
          );

          // Redirect to home on success
          // 성공 시 홈으로 이동
          navigate("/", { replace: true });
        }
      } catch (err) {
        
        // Handle verification failure (Redirect to login)
        // 검증 실패 시 에러 처리 (로그인 페이지로 이동)
        console.error("Verification failed:", err);
        navigate("/login", { replace: true });
      }
    };

    verifyLogin();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
      <h2 className="text-xl font-bold text-slate-700">로그인 확인 중...</h2>
      <p className="text-slate-500 mt-2">잠시만 기다려주세요.</p>
    </div>
  );
}
