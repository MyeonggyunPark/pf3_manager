from django.conf import settings
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter


# Custom adapter to bridge Backend auth with Frontend routes
# 백엔드 인증을 프론트엔드 라우트와 연결하기 위한 커스텀 어댑터
class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom Adapter for Allauth Account Management.
    Overrides default behavior to ensure compatibility with the Headless Frontend (React).
    Specifically, it generates email confirmation links pointing to the frontend route
    instead of the backend template.

    Allauth 계정 관리를 위한 커스텀 어댑터입니다.
    헤드리스 프론트엔드(React)와의 호환성을 보장하기 위해 기본 동작을 재정의합니다.
    구체적으로, 이메일 인증 링크가 백엔드 템플릿 대신 프론트엔드 라우트를 가리키도록 생성합니다.
    """

    def get_email_confirmation_url(self, request, emailconfirmation):
        # Override to generate a Frontend-compatible verification link
        # 프론트엔드 호환 인증 링크를 생성하도록 재정의

        # Get Frontend Base URL from settings (Railway Env Var or Localhost)
        # 설정에서 프론트엔드 기본 URL 가져오기 (Railway 환경변수 또는 로컬호스트)
        base_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173")

        # Remove trailing slash to prevent double slashes
        # 이중 슬래시 방지를 위해 끝부분 슬래시 제거
        base_url = base_url.rstrip("/")

        # Return URL pointing to the Frontend route
        # 프론트엔드 라우트를 가리키는 URL 반환
        return f"{base_url}/accounts/confirm-email/{emailconfirmation.key}/"


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def save_user(self, request, sociallogin, form=None):
        """
        Custom Adapter for Social Login (Google, Kakao, etc.).
        Intervenes during the social signup process to populate custom user fields
        (provider, name) that are not automatically handled by default.

        소셜 로그인(구글, 카카오 등)을 위한 커스텀 어댑터입니다.
        소셜 회원가입 과정에 개입하여 기본적으로 처리되지 않는 커스텀 사용자 필드
        (provider, name)를 자동으로 채워 넣습니다.
        """

        # Run the default save logic (creates the user instance)
        # 기본 저장 로직 실행 (유저 인스턴스 생성)
        user = super().save_user(request, sociallogin, form)

        # Set the provider field (e.g., 'google', 'kakao')
        # provider 필드 설정 (예: 'google', 'kakao')
        user.provider = sociallogin.account.provider

        # Ignore social provider's name data and force email prefix for consistency
        # 소셜 제공자의 이름 데이터를 무시하고 일관성을 위해 이메일 접두사 사용 강제
        if not user.name:
            user.name = user.email.split("@")[0]

        # Save the updated user instance
        # 업데이트된 유저 인스턴스 저장
        user.save()

        return user

    def get_login_redirect_url(self, request):
        """
        Redirects user to the Frontend success page after successful social login.
        Crucial for splitting Backend/Frontend on different domains (e.g., Railway).

        소셜 로그인 성공 후 사용자를 프론트엔드 성공 페이지로 리다이렉트합니다.
        백엔드와 프론트엔드가 다른 도메인(예: Railway)에 있을 때 필수적입니다.
        """
        # Get Frontend Base URL from settings
        # 설정에서 프론트엔드 기본 URL 가져오기
        base_url = getattr(settings, "FRONTEND_BASE_URL", "http://127.0.0.1:5173")
        base_url = base_url.rstrip("/")

        # Return the absolute URL to the frontend social success page
        # 프론트엔드 소셜 로그인 성공 페이지의 절대 경로 반환
        return f"{base_url}/social/success/"
