"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Django Admin Interface
    # 장고 관리자 인터페이스
    path("admin/", admin.site.urls),
    
    # Main API endpoints for the Tutor application
    # Tutor 애플리케이션의 메인 API 엔드포인트
    path("api/", include("tutor.urls")),
    
    # Authentication Endpoints (dj-rest-auth & allauth)
    # 인증 엔드포인트 (dj-rest-auth 및 allauth)
    # Standard Login/Logout/Password Reset
    # 표준 로그인/로그아웃/비밀번호 재설정
    path("api/auth/", include("dj_rest_auth.urls")),
    
    # Registration (Signup)
    # 회원가입
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    
    # Social Login (Google, Kakao, etc.)
    # 소셜 로그인 (구글, 카카오 등)
    path("api/auth/social/", include("allauth.socialaccount.urls")),
]

# Serve media files during development
# 개발 중 미디어 파일 제공
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
