import axios from "axios";

// Helper to retrieve cookie by name
// 현재 설정에서는 JS가 쿠키를 읽을 수 없어 사용되지 않으므로 함수 정의도 주석 처리함.
// function getCookie(name) {
//   let cookieValue = null;
//   if (document.cookie && document.cookie !== "") {
//     const cookies = document.cookie.split(";");
//     for (let i = 0; i < cookies.length; i++) {
//       const cookie = cookies[i].trim();
//       if (cookie.substring(0, name.length + 1) === name + "=") {
//         cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//         break;
//       }
//     }
//   }
//   return cookieValue;
// }

// Base API URL setup from env
// 환경 변수에서 API 기본 URL 설정
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

// Create Axios instance with cookie support (HttpOnly)
// 쿠키 지원(HttpOnly)을 포함한 Axios 인스턴스 생성
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
// 요청 인터셉터
api.interceptors.request.use(
  (config) => {

    // CSRF 로직 비활성화
    /* const csrfToken = getCookie("csrftoken");
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    */

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Global error handling
// 응답 인터셉터: 전역 에러 처리
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Session/Token expired)
    // 401 미인증 에러 처리 (토큰 만료 등)
    if (error.response && error.response.status === 401) {
      
      // Prevent handling on Social Login Success page
      // 소셜 로그인 성공 페이지에서는 처리 방지
      const isSocialSuccessPage =
        window.location.pathname.includes("/social/success");

      // Skip for login/registration requests
      // 로그인/회원가입 요청은 로직 제외
      if (
        !originalRequest.url.includes("/login/") &&
        !originalRequest.url.includes("/registration/") &&
        !isSocialSuccessPage
      ) {
        console.warn("[API] Session/Token expired or invalid. Logging out...");

        // Clear local storage
        // 로컬 스토리지 초기화
        localStorage.removeItem("user_info");
        localStorage.removeItem("is_logged_in");
        localStorage.removeItem("saved_email");

        const currentPath = window.location.pathname;

        // Prevent redirect loop on password reset pages
        // 비밀번호 재설정 페이지에서는 리다이렉트 방지
        if (currentPath.includes("/password-reset")) {
          return Promise.reject(error);
        }

        // Redirect to login page
        // 로그인 페이지로 이동
        if (currentPath !== "/login") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
