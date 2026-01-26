import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import AuthPage from "./pages/AuthPage";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";
import EmailVerification from "./pages/EmailVerification";
import SocialLoginSuccess from "./pages/SocialLoginSuccess";
import Dashboard from "./pages/Dashboard";
import Schedule from "./pages/Schedule";
import StudentList from "./pages/StudentList";
import CourseList from "./pages/CourseList";
import ExamResults from "./pages/ExamResults";
import Settings from "./pages/Settings";

// Protected Route Wrapper
// 로그인된 사용자만 접근 허용하는 래퍼 컴포넌트
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = !!localStorage.getItem("is_logged_in");
  return isLoggedIn ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login/Signup Page */}
        {/* 로그인/회원가입 페이지 */}
        <Route
          path="/login"
          element={<AuthPage onLogin={() => (window.location.href = "/")} />}
        />

        {/* Password Reset Confirmation Page */}
        {/* 비밀번호 재설정 확인 페이지 */}
        <Route
          path="/password-reset/confirm/:uid/:token"
          element={<PasswordResetConfirm />}
        />

        {/* Email Verification Page */}
        {/* 이메일 인증 페이지 */}
        <Route
          path="/accounts/confirm-email/:key"
          element={<EmailVerification />}
        />

        {/* Social Login Success Handling Page */}
        {/* 소셜 로그인 성공 처리 페이지 */}
        <Route path="/social/success" element={<SocialLoginSuccess />} />

        {/*  Protected Routes (Accessible after login) */}
        {/* 보호된 라우트 (로그인 후 접근 가능) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="students" element={<StudentList />} />
          <Route path="courses" element={<CourseList />} />
          <Route path="exams" element={<ExamResults />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
