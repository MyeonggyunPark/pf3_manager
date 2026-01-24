import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _


class CustomPasswordValidator:
    """
    Custom password validator to enforce complexity rules.
    Checks for minimum length, uppercase letters, and special characters.

    비밀번호 복잡도 규칙을 강제하기 위한 커스텀 검증기.
    최소 길이, 대문자 포함 여부, 특수문자 포함 여부를 확인합니다.
    """

    def validate(self, password, user=None):
        # Check minimum length (8 characters or more)
        # 최소 8글자 이상인지 확인
        if len(password) < 8:
            raise ValidationError(
                _("비밀번호는 최소 8자 이상이어야 합니다."),
                code="password_too_short",
            )

        # Check for at least one uppercase letter
        # 최소 1개의 영문 대문자가 포함되어 있는지 확인
        if not re.search(r"[A-Z]", password):
            raise ValidationError(
                _("비밀번호에는 최소 1개의 영문 대문자가 포함되어야 합니다."),
                code="password_no_upper",
            )

        # Check for at least one special character
        # 최소 1개의 특수문자가 포함되어 있는지 확인
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            raise ValidationError(
                _("비밀번호에는 최소 1개의 특수문자가 포함되어야 합니다."),
                code="password_no_symbol",
            )

    def get_help_text(self):
        """
        Returns the help text displayed in Django admin or forms.
        장고 관리자 페이지나 폼에서 표시될 도움말 텍스트를 반환합니다.
        """
        return _(
            "비밀번호는 영문 대문자, 특수문자 포함 8자 이상이어야 합니다."
        )