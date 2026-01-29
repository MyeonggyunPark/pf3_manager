import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { Loader2, PartyPopper } from "lucide-react";
import api from "../api";
import Button from "../components/ui/Button";

// Welcome Modal Component
// 환영 모달 컴포넌트
const WelcomeModal = ({ isOpen, onClose, userName }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center animate-in zoom-in-95 relative">
        {/* Icon Circle */}
        {/* 아이콘 원형 */}
        <div className="w-16 h-16 bg-accent/20 text-[#4a7a78] rounded-full flex items-center justify-center mb-4">
          <PartyPopper className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-[#4a7a78] mb-2">회원가입 완료</h3>

        <p className="text-slate-400 text-center mb-6 text-sm leading-relaxed">
          환영합니다, <strong>{userName}</strong>님!
          <br />
          소셜 계정으로 회원가입이 완료되었습니다.
          <br />
          이제 서비스를 이용하실 수 있습니다.
        </p>

        <Button
          onClick={onClose}
          className="w-full h-11 shadow-lg shadow-primary/20 hover:shadow-primary/30 cursor-pointer"
        >
          메인 화면으로
        </Button>
      </div>
    </div>,
    document.body,
  );
};

// Social Login Redirect Handler
// 소셜 로그인 성공 후 처리 핸들러
export default function SocialLoginSuccess() {
  const navigate = useNavigate();
  const location = useLocation();

  // States for Modal & Loading
  // 모달 및 로딩 상태
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [userName, setUserName] = useState("회원");

  // Verify session on component mount
  // 컴포넌트 마운트 시 세션 검증 수행
  useEffect(() => {
    const verifyLogin = async () => {
      try {
        console.log("Verifying social login status...");

        // Check URL for 'new_user' flag
        // URL에서 신규 유저 플래그 확인
        const params = new URLSearchParams(location.search);
        const isNewUser = params.get("new_user") === "true";

        // Fetch user data to confirm valid session
        // 사용자 데이터를 조회하여 유효한 세션인지 확인
        const response = await api.get("/api/auth/user/");

        if (response.status === 200) {
          console.log("Login verified successfully!", response.data);

          const name = response.data.name || response.data.email.split("@")[0];
          setUserName(name);

          // Update local storage flags
          // 로컬 스토리지 플래그 업데이트
          localStorage.setItem("is_logged_in", "true");
          localStorage.setItem(
            "user_info",
            JSON.stringify({
              pk: response.data.pk,
              email: response.data.email,
              name: name,
            }),
          );

          // Branching Logic: New User vs Existing User
          // 분기 처리: 신규 유저 vs 기존 유저
          if (isNewUser) {

            // Stop loading and show modal (Do not redirect yet)
            // 로딩을 멈추고 모달 표시 (아직 리다이렉트 안 함)
            setIsProcessing(false);
            setShowModal(true);
          } else {

            // Existing user: Redirect immediately
            // 기존 유저: 즉시 리다이렉트
            navigate("/", { replace: true });
          }
        }
      } catch (err) {

        // Handle verification failure (Redirect to login)
        // 검증 실패 시 에러 처리 (로그인 페이지로 이동)
        console.error("Verification failed:", err);
        navigate("/login", { replace: true });
      }
    };

    verifyLogin();
  }, [navigate, location]);

  // Handle Modal Close -> Go to Dashboard
  // 모달 닫기 핸들러 -> 대시보드로 이동
  const handleModalClose = () => {
    navigate("/", { replace: true });
  };

  // Render Modal if showModal is true
  // 모달 표시 상태일 때 렌더링
  if (showModal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <WelcomeModal
          isOpen={showModal}
          onClose={handleModalClose}
          userName={userName}
        />
      </div>
    );
  }

  // Default Loading View (Only render when processing)
  // 기본 로딩 화면 (처리 중일 때만 렌더링)
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700">로그인 확인 중...</h2>
        <p className="text-slate-500 mt-2 text-sm">잠시만 기다려주세요.</p>
      </div>
    );
  }

  // Return null to prevent flashing empty screen before redirect
  // 리다이렉트 전 빈 화면 깜빡임 방지를 위해 null 반환
  return null;
}
