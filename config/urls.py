from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
from django.http import JsonResponse

from tutor.views import social_login_callback

# Placeholder view for password reset confirmation
# 비밀번호 재설정 확인을 위한 플레이스홀더 뷰
def password_reset_confirm_placeholder(request, uidb64, token):
    return JsonResponse(
        {
            "detail": "Password reset link generated successfully.",
            "uid": uidb64,
            "token": token,
        }
    )

urlpatterns = [
    # Django Admin Interface
    # 장고 관리자 인터페이스
    path("admin/", admin.site.urls),
    
    # Main API endpoints for the Tutor application
    # Tutor 애플리케이션의 메인 API 엔드포인트
    path("api/", include("tutor.urls")),
    
    # Authentication Endpoints (Login, Logout, User Details, Password Change)
    # 인증 엔드포인트 (로그인, 로그아웃, 유저 정보, 비밀번호 변경)
    path("api/auth/", include("dj_rest_auth.urls")),
    
    # Registration (Signup)
    # 회원가입
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    
    # Allauth URLs for additional account management
    # 추가 계정 관리를 위한 Allauth URLs
    path("accounts/", include("allauth.urls")),
    
    # Password Reset Confirmation Placeholder
    # dj-rest-auth가 이 URL 이름을 찾아서 이메일 링크 생성
    path(
        "password-reset/confirm/<uidb64>/<token>/",
        password_reset_confirm_placeholder,
        name="password_reset_confirm"
    ),
    
    # Explicitly map the callback URL to our view function
    # 콜백 URL을 우리의 뷰 함수(JWT발급 + 신규유저체크)로 명시적 연결
    path("api/social/callback/", social_login_callback, name="social_callback"),
]

# Serve media files
# 미디어 파일 제공
urlpatterns += [
    re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT}),
]

# Serve media files during development
# 개발 중 미디어 파일 제공
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
