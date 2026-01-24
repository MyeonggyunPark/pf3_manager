import axios from "axios";

// Extract CSRF token from cookies
// 쿠키에서 CSRF 토큰 추출
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();

      // Check for cookie name match
      // 쿠키 이름 일치 확인
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Set API base URL
// API 기본 URL 설정
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,

  // Enable cookie transmission (HttpOnly)
  // 쿠키 전송 허용 (HttpOnly)
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie("csrftoken");

    // Inject CSRF token if present
    // CSRF 토큰 존재 시 헤더 주입
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors
    // 401 인증 에러 처리
    if (error.response && error.response.status === 401) {
      
      // Exclude login requests
      // 로그인 요청 제외
      if (!originalRequest.url.includes("/login/")) {
        console.warn("[API] Session expired. Logging out...");

        // Clear local storage
        // 로컬 스토리지 초기화
        localStorage.removeItem("user_info");
        localStorage.removeItem("is_logged_in");

        // Redirect to login page if not already there
        // 로그인 페이지가 아닌 경우 이동
        if (window.location.pathname !== "/login") {
          alert("Session expired. Please log in again.");
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
