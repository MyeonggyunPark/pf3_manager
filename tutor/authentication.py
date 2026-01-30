from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Custom Session Authentication that bypasses CSRF checks.
    Useful for Cross-Domain environments (Frontend/Backend separated)
    where CSRF tokens cannot be easily shared via cookies.

    CSRF 검사를 우회하는 커스텀 세션 인증 클래스입니다.
    CSRF 토큰을 쿠키로 공유하기 어려운 크로스 도메인 환경(프론트엔드/백엔드 분리)에서 유용합니다.
    """

    def enforce_csrf(self, request):
        """
        Overridden to disable CSRF validation.
        Standard SessionAuthentication enforces CSRF check, but we skip it here.

        CSRF 검증을 비활성화하기 위해 오버라이드(재정의)했습니다.
        표준 세션 인증은 CSRF 검사를 강제하지만, 여기서는 이를 건너뜁니다.
        """
        return
