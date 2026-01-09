import axios from "axios";

// Helper function to extract CSRF token from cookies
// 쿠키에서 CSRF 토큰을 추출하는 헬퍼 함수
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Check if the cookie string begins with the name
      // 쿠키 문자열의 시작이 'name=' 인지 확인
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Get URL from environment variables (use local address if missing)
// 환경 변수에서 URL을 가져오도록 수정 (없으면 로컬 주소 사용)
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  // [Required] Allow sending/receiving cookies (Session ID, CSRF Token)
  // [필수] 쿠키(세션ID, CSRF토큰) 주고받기 허용
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Inject CSRF Token
// 요청 인터셉터: CSRF 토큰 주입
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCookie("csrftoken");
    // Django typically checks CSRF only on state-changing requests like POST, PUT, DELETE
    // Django는 보통 POST, PUT, DELETE 등 데이터 변경 요청에만 CSRF 검사를 함
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response Interceptor: Handle 401 Unauthorized
// 응답 인터셉터: 401 처리
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      if (!error.config.url.includes("/login/")) {
        console.warn("Unauthorized! Session expired.");
        localStorage.removeItem("user_info");
        localStorage.removeItem("is_logged_in");
        // Uncomment if redirect is needed
        // 필요 시 주석 해제
        // window.location.href = "/";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
