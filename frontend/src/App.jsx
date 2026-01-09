import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login";
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
        <Route
          path="/login"
          element={<LoginPage onLogin={() => (window.location.href = "/")} />}
        />

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
