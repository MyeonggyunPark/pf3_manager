from allauth.account.adapter import DefaultAccountAdapter
from django.conf import settings


# Custom adapter to bridge Backend auth with Frontend routes
# 백엔드 인증을 프론트엔드 라우트와 연결하기 위한 커스텀 어댑터
class CustomAccountAdapter(DefaultAccountAdapter):
    def get_email_confirmation_url(self, request, emailconfirmation):
        # Override to generate a Frontend-compatible verification link
        # 프론트엔드 호환 인증 링크를 생성하도록 재정의

        # Get Frontend Base URL from settings
        # 설정에서 프론트엔드 기본 URL 가져오기
        base_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173")

        # Remove trailing slash to prevent double slashes
        # 이중 슬래시 방지를 위해 끝부분 슬래시 제거
        base_url = base_url.rstrip("/")

        # Return URL pointing to the Frontend route
        # 프론트엔드 라우트를 가리키는 URL 반환
        return f"{base_url}/accounts/confirm-email/{emailconfirmation.key}/"
