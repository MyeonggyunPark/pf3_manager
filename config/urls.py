"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


# Placeholder view for password reset confirmation
# This view is required by dj-rest-auth to generate the email link,
# but the actual reset page will be handled by the Frontend (React/Vue).
# 비밀번호 재설정 확인을 위한 플레이스홀더 뷰
# dj-rest-auth가 이메일 링크를 생성하기 위해 이 URL 패턴을 필요로 하지만,
# 실제 비밀번호 재설정 화면은 프론트엔드에서 처리합니다.
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
]

# Serve media files during development
# 개발 중 미디어 파일 제공
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


from django.urls import path
from django.http import HttpResponse
from django.core.mail import send_mail
from django.conf import settings


def debug_email_view(request):
    try:
        send_mail(
            "[테스트] MS Planer 이메일 설정 확인",
            "이 메일이 도착했다면 SMTP 설정(SSL/465)이 완벽한 것입니다.",
            settings.EMAIL_HOST_USER,
            ["audrbs92@gmail.com"], 
            fail_silently=False,
        )
        return HttpResponse(
            "<h1>✅ 이메일 발송 성공!</h1><p>설정이 완벽합니다. 메일함을 확인하세요.</p>"
        )
    except Exception as e:
        return HttpResponse(
            f"<h1>❌ 이메일 발송 실패</h1><p>에러 로그:</p><pre>{e}</pre>"
        )


# 기존 urlpatterns에 테스트 경로 추가
urlpatterns += [
    path("debug-email/", debug_email_view),
]
