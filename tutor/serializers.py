import os

from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth import get_user_model
from django.db import transaction

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from dj_rest_auth.registration.serializers import RegisterSerializer
from dj_rest_auth.serializers import (
    PasswordChangeSerializer,
    PasswordResetSerializer,
    PasswordResetConfirmSerializer,
)

from .models import (
    Tutor,
    Student,
    CourseRegistration,
    ExamStandard,
    ExamModule,
    ExamSection,
    ExamRecord,
    ExamAttachment,
    ExamScoreInput,
    ExamDetailResult,
    OfficialExamResult,
    Lesson,
    Todo,
)


# ==========================================
# 1. Auth & User Serializers
# ==========================================
class TutorSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving Tutor (User) information.
    튜터(사용자) 정보를 조회하기 위한 시리얼라이저입니다.
    """

    class Meta:
        model = Tutor

        # Expose only necessary fields to the frontend
        # 프론트엔드에 필요한 필드만 노출합니다 (보안 및 데이터 최소화)
        fields = ("id", "email", "name", "provider", "is_staff")

        # Prevent modification of critical fields via API
        # API를 통한 중요한 필드의 임의 수정을 방지합니다
        read_only_fields = ("email", "provider", "is_staff")


class CustomRegisterSerializer(RegisterSerializer):
    """
    Custom registration serializer to accept additional fields (e.g., name).
    Used in conjunction with dj-rest-auth settings in settings.py.

    추가 필드(예: 이름)를 받기 위한 커스텀 회원가입 시리얼라이저입니다.
    settings.py의 dj-rest-auth 설정(ACCOUNT_ADAPTER 등)과 연동하여 사용됩니다.
    """

    username = serializers.CharField(required=False, allow_blank=True)

    # Add 'name' field which is not in the default RegisterSerializer
    # 기본 RegisterSerializer에는 없는 'name' 필드를 명시적으로 추가합니다
    name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        """
        Override standard signup method.
        Logic: If name is provided, use it. Otherwise, extract from email.

        기본 회원가입 로직 오버라이드.
        로직: 이름이 제공되면 저장하고, 없으면 이메일 앞부분을 추출하여 이름으로 사용.
        """

        if "name" in request.data and request.data["name"]:
            user.name = request.data["name"]
        else:
            user.name = user.email.split("@")[0]

        if not user.username:
            user.username = user.email.split("@")[0]

        user.save()


# ==========================================
# 2. Student & Course Serializers
# ==========================================
class CourseRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for Course Registration history.
    수강 등록 이력을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = CourseRegistration
        fields = "__all__"


class StudentSerializer(serializers.ModelSerializer):
    """
    Serializer for Student information.
    The tutor is assigned in the ViewSet, not here.

    학생 정보를 위한 시리얼라이저입니다.
    튜터 할당 로직은 시리얼라이저가 아닌 ViewSet에서 처리됩니다.
    """

    # Optional: Include course history when retrieving student info (Inverse relation)
    # 선택사항: 학생 정보 조회 시 수강 이력도 함께 포함 (역참조 데이터)
    # courses = CourseRegistrationSerializer(many=True, read_only=True, source='courseregistration_set')

    class Meta:
        model = Student
        fields = "__all__"

        # Tutor is automatically assigned based on the logged-in user in the ViewSet
        # 튜터는 ViewSet에서 로그인한 사용자를 기준으로 자동 할당되므로 읽기 전용으로 설정합니다
        read_only_fields = ("tutor",)


# ==========================================
# 3. Exam Meta Data Serializers (Hierarchical)
# ==========================================
class ExamSectionSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Sections (Lowest level of exam hierarchy).
    시험 섹션(시험 계층 구조의 최하위: 문제 영역)을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamSection
        fields = "__all__"


class ExamModuleSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Modules.
    Includes nested ExamSection data using the reverse relationship.

    시험 모듈을 위한 시리얼라이저입니다.
    역참조 관계를 사용하여 중첩된 시험 섹션 데이터를 포함합니다.
    """

    # Nested Serializer: Retrieve sections belonging to this module
    # 'source="sections"' refers to the related_name in the ExamSection model
    # 중첩 시리얼라이저: 이 모듈에 속한 섹션들을 조회합니다
    # 'source="sections"'는 ExamSection 모델에 정의된 related_name을 참조합니다
    sections = ExamSectionSerializer(many=True, read_only=True)

    class Meta:
        model = ExamModule
        fields = "__all__"


class ExamStandardSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Standards (Highest level of exam hierarchy).
    Includes nested ExamModule data.

    시험 표준(시험 계층 구조의 최상위: 시험 종류)을 위한 시리얼라이저입니다.
    중첩된 시험 모듈 데이터를 포함합니다.
    """

    # Nested Serializer: Retrieve modules belonging to this standard
    # 중첩 시리얼라이저: 이 표준에 속한 모듈들을 조회합니다
    modules = ExamModuleSerializer(many=True, read_only=True)

    class Meta:
        model = ExamStandard
        fields = "__all__"


# ==========================================
# 4. Exam Records & Results Serializers
# ==========================================
class ExamAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam file attachments.
    시험 첨부 파일(PDF, 이미지 등)을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamAttachment
        fields = "__all__"


class ExamScoreInputSerializer(serializers.ModelSerializer):
    """
    Serializer for manual score inputs (e.g., Writing/Speaking).
    수동 점수 입력(예: 쓰기/말하기 영역)을 위한 시리얼라이저입니다.
    """

    # Read-only fields to display section metadata (category, max score) on the frontend
    # 프론트엔드 표시를 위해 섹션 메타데이터(카테고리, 만점)를 보여주는 읽기 전용 필드입니다.
    category = serializers.CharField(source="exam_section.category", read_only=True)
    section_max_score = serializers.DecimalField(
        source="exam_section.section_max_score",
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )

    class Meta:
        model = ExamScoreInput
        fields = "__all__"
        read_only_fields = ("exam_record",)


class ExamDetailResultSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed question results (O/X).
    문항별 상세 결과(O/X 데이터)를 위한 시리얼라이저입니다.
    """

    # Read-only fields to provide context (category, points) for the detailed results
    # 상세 결과를 위한 컨텍스트(카테고리, 배점, 섹션 만점)를 제공하는 읽기 전용 필드입니다.
    category = serializers.CharField(source="exam_section.category", read_only=True)
    points = serializers.DecimalField(
        source="exam_section.points_per_question",
        max_digits=4,
        decimal_places=2,
        read_only=True,
    )
    section_max_score = serializers.IntegerField(
        source="exam_section.section_max_score", read_only=True
    )

    class Meta:
        model = ExamDetailResult
        fields = "__all__"
        read_only_fields = ("exam_record",)


class ExamRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for the main Exam Record.
    Includes nested data for attachments, score inputs, and detailed results.

    메인 시험 기록을 위한 시리얼라이저입니다.
    첨부 파일, 점수 입력, 상세 결과에 대한 중첩 데이터를 포함하여 한 번에 조회합니다.
    """

    # Read-only fields for UI: Use 'source' to traverse relationships (dot notation)
    # UI를 위한 읽기 전용 필드: 'source' 속성의 점 표기법(.)을 사용하여 관계된 객체의 필드에 접근합니다
    student_name = serializers.CharField(source="student.name", read_only=True)
    exam_name = serializers.CharField(source="exam_standard.name", read_only=True)

    # Changed to 'target_level' to display the student's goal instead of current level
    # 현재 레벨 대신 학생의 목표 레벨을 표시하기 위해 'target_level'로 변경되었습니다
    student_level = serializers.CharField(source="student.target_level", read_only=True)

    # Calculate max score dynamically based on exam mode (Full vs Partial)
    # 응시 유형(전체 vs 부분)에 따라 만점을 동적으로 계산하여 제공
    max_score = serializers.SerializerMethodField()

    # Nested Serializers (Inverse Relations)
    # Used for displaying all related data in the detail view
    # 중첩 시리얼라이저 (역참조 관계)
    # 상세 보기에서 관련된 모든 하위 데이터를 표시하기 위해 사용됩니다
    attachments = ExamAttachmentSerializer(many=True, read_only=True)
    score_inputs = ExamScoreInputSerializer(many=True)
    detail_results = ExamDetailResultSerializer(many=True)

    class Meta:
        model = ExamRecord
        fields = "__all__"

        # Prevent tutor modification via API
        # API를 통한 튜터 정보 변조 방지
        read_only_fields = ("tutor",)

    def get_max_score(self, obj):
        """
        Determine max score based on the exam mode.
        If FULL, use the standard's total score. If partial, find the specific module's max score.

        응시 유형에 따른 만점 점수를 반환합니다.
        전체 응시인 경우 표준 총점을, 부분 응시인 경우 해당 모듈의 만점을 찾아 반환합니다.
        """
        
        # Full Exam (Total Score from Standard)
        # 전체 응시인 경우: ExamStandard 모델의 total_score 사용
        if obj.exam_mode == "FULL":
            return obj.exam_standard.total_score

        # Partial Exam (Written/Oral Score from Module)
        # 부분 응시인 경우: ExamStandard와 연결된 ExamModule 중 타입이 일치하는 것 검색
        module = obj.exam_standard.modules.filter(module_type=obj.exam_mode).first()

        # Return module max_score if exists, else 0
        # 모듈이 존재하면 해당 모듈의 max_score 반환, 없으면 0
        return module.max_score if module else 0

    @transaction.atomic
    def create(self, validated_data):
        """
        Transactional Create.
        Saves ExamRecord and all nested results in one go.

        트랜잭션 생성.
        시험 기록과 모든 중첩된 결과를 한 번에 저장합니다.
        """

        # Extract nested data from validated_data
        # 검증된 데이터에서 중첩 데이터 추출
        score_inputs_data = validated_data.pop("score_inputs", [])
        detail_results_data = validated_data.pop("detail_results", [])

        # Create the Parent
        # 시험 기록 헤더 생성
        exam_record = ExamRecord.objects.create(**validated_data)

        # Bulk Create Score Inputs
        # 점수 입력 데이터 대량 생성
        score_instances = [
            ExamScoreInput(exam_record=exam_record, **item)
            for item in score_inputs_data
        ]
        ExamScoreInput.objects.bulk_create(score_instances)

        # Bulk Create Detail Results (O/X)
        # 상세 결과 데이터 대량 생성
        detail_instances = [
            ExamDetailResult(exam_record=exam_record, **item)
            for item in detail_results_data
        ]
        ExamDetailResult.objects.bulk_create(detail_instances)

        return exam_record

    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Transactional Update.
        Updates header and replaces nested results.

        트랜잭션 수정.
        헤더를 수정하고 중첩된 결과들을 교체(재작성)합니다.
        """

        score_inputs_data = validated_data.pop("score_inputs", None)
        detail_results_data = validated_data.pop("detail_results", None)

        # Update standard fields
        # 기본 필드 업데이트
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update Nested Data: Strategy -> Delete Old & Create New
        # Simplest & Safest strategy for ensuring data integrity in exams
        # 중첩 데이터 업데이트 전략: 기존 데이터 삭제 후 재생성
        # 시험 데이터의 무결성을 보장하기 위한 가장 간단하고 안전한 전략

        if score_inputs_data is not None:
            instance.score_inputs.all().delete()
            score_instances = [
                ExamScoreInput(exam_record=instance, **item)
                for item in score_inputs_data
            ]
            ExamScoreInput.objects.bulk_create(score_instances)

        if detail_results_data is not None:
            instance.detail_results.all().delete()
            detail_instances = [
                ExamDetailResult(exam_record=instance, **item)
                for item in detail_results_data
            ]
            ExamDetailResult.objects.bulk_create(detail_instances)

        return instance


# ==========================================
# 5. Official Exam Results Serializers
# ==========================================
class OfficialExamResultSerializer(serializers.ModelSerializer):
    """
    Serializer for Official Exam Results.
    Handles data conversion for certification exams like Telc or Goethe.

    정규 시험 결과를 위한 시리얼라이저입니다.
    Telc나 Goethe 같은 자격증 시험의 데이터 변환 및 조회를 처리합니다.
    """

    # Read-only field: Traverse ForeignKey to get the ExamStandard name
    # 읽기 전용 필드: ForeignKey를 타고 들어가 시험 표준의 이름을 가져옵니다
    exam_standard_name = serializers.CharField(
        source="exam_standard.name", read_only=True
    )

    # Read-only fields: Flatten student data for easier frontend display
    # 읽기 전용 필드: 프론트엔드 표시 편의를 위해 학생 데이터를 평탄화(Flatten)하여 제공합니다
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_level = serializers.CharField(source="student.target_level", read_only=True)

    # Provide max score for reference if linked to a standard
    # 표준과 연결된 경우 참조용으로 만점 점수를 제공
    max_score = serializers.SerializerMethodField()

    class Meta:
        model = OfficialExamResult
        fields = "__all__"

    def get_max_score(self, obj):
        """
        Calculate max score dynamically based on exam mode.
        Returns None for manual entries without a standard link.

        응시 유형에 따라 만점을 동적으로 계산합니다.
        표준과 연결되지 않은 수동 입력의 경우 None을 반환합니다.
        """
        
        # Manual entry without standard link -> Max score unknown
        # 표준 링크가 없는 수동 입력 -> 만점 알 수 없음
        if not obj.exam_standard:
            return None

        # Full Exam
        # 전체 응시인 경우: 표준 총점 반환
        if obj.exam_mode == "FULL":
            return obj.exam_standard.total_score

        # Partial Exam (Written/Oral)
        # Search for matching module in standard
        # 부분 응시인 경우: 표준 내에서 일치하는 모듈(ExamModule) 검색하여 점수 반환
        elif obj.exam_mode in ["WRITTEN", "ORAL"]:
            # 'modules' is the related_name from ExamModule to ExamStandard
            module = obj.exam_standard.modules.filter(module_type=obj.exam_mode).first()
            if module:
                return module.max_score

        return None


# ==========================================
# 6. Schedule Serializers
# ==========================================
class LessonSerializer(serializers.ModelSerializer):
    """
    Serializer for Lesson (Schedule).
    Includes computed fields 'start' and 'end' for frontend calendar libraries.

    수업(일정)을 위한 시리얼라이저입니다.
    프론트엔드 캘린더 라이브러리(FullCalendar 등) 사용을 위해 계산된 'start'와 'end' 필드를 포함합니다.
    """

    # Read-only fields for displaying related student info
    # 관련 학생 정보를 표시하기 위한 읽기 전용 필드
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_level = serializers.CharField(source="student.target_level", read_only=True)

    # Computed fields for Calendar UI using SerializerMethodField
    # Format: ISO 8601 String ("YYYY-MM-DDTHH:MM:SS")
    # SerializerMethodField를 사용하여 캘린더 UI용 필드를 계산합니다
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = "__all__"

    def get_start(self, obj):
        """
        Combine date and start_time into a full ISO datetime string.
        날짜와 시작 시간을 결합하여 완전한 ISO 날짜/시간 문자열을 반환합니다.
        """
        return f"{obj.date}T{obj.start_time}"

    def get_end(self, obj):
        """
        Combine date and end_time into a full ISO datetime string.
        날짜와 종료 시간을 결합하여 완전한 ISO 날짜/시간 문자열을 반환합니다.
        """
        return f"{obj.date}T{obj.end_time}"

    # Backend Validation for Data Integrity
    # Even if frontend validates, backend must prevent invalid data (Security)
    # 데이터 무결성을 위한 백엔드 유효성 검사
    # 프론트엔드 검증이 있더라도, 우회 접근을 막기 위해 백엔드에서도 반드시 검증해야 함
    def validate(self, data):
        start = data.get("start_time")
        end = data.get("end_time")

        # Logic: End time must be after start time
        # 로직: 종료 시간은 반드시 시작 시간보다 뒤여야 함
        if start and end and start >= end:
            raise serializers.ValidationError(
                "종료 시간은 시작 시간보다 늦어야 합니다."
            )
        return data


# ==========================================
# 7. Todo Serializers
# ==========================================
class TodoSerializer(serializers.ModelSerializer):
    """
    Serializer for Todo List.
    Simple CRUD serializer for task management.

    투두 리스트를 위한 시리얼라이저.
    작업 관리를 위한 간단한 CRUD 시리얼라이저.
    """

    # Read-only fields for displaying human-readable labels in frontend
    # 프론트엔드 표기를 위한 읽기 전용 필드
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )
    priority_display = serializers.CharField(
        source="get_priority_display", read_only=True
    )

    class Meta:
        model = Todo
        fields = "__all__"
        read_only_fields = ("tutor", "category_display", "priority_display")


# ==========================================
# 8. Password Management Serializers
# ==========================================
class CustomPasswordChangeSerializer(PasswordChangeSerializer):
    """
    Custom serializer for changing user password.
    Includes additional validation for the current (old) password.

    사용자 비밀번호 변경을 위한 커스텀 시리얼라이저입니다.
    현재(기존) 비밀번호에 대한 추가 검증 로직을 포함합니다.
    """

    def validate_old_password(self, value):
        """
        Check if the provided old password matches the user's current password.
        입력된 기존 비밀번호가 사용자의 현재 비밀번호와 일치하는지 확인합니다.
        """
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("현재 비밀번호와 일치하지 않습니다.")
        return value


# ==========================================
# 9. Password Reset Custom Serializer
# ==========================================
class CustomPasswordResetSerializer(PasswordResetSerializer):
    """
    Custom Serializer for Password Reset in Headless Architecture.
    Redirects the email link to the Frontend URL instead of the Backend.

    헤드리스 아키텍처를 위한 비밀번호 재설정 시리얼라이저.
    이메일 링크가 백엔드(Django)가 아닌 프론트엔드(React/Vue) URL을 가리키도록 조정합니다.
    """

    @property
    def password_reset_form_class(self):
        return PasswordResetForm

    def get_email_options(self):
        return {
            "email_template_name": "registration/password_reset_email.html",
            "html_email_template_name": "registration/password_reset_email.html",
        }

    def save(self):
        request = self.context.get("request")

        # Get Frontend domain from env (e.g., localhost:5173 or myapp.com)
        # 환경 변수에서 프론트엔드 도메인 획득
        frontend_domain = os.environ.get("FRONTEND_DOMAIN", "localhost:5173")

        opts = {
            "use_https": request.is_secure() if request else False,
            "from_email": getattr(settings, "DEFAULT_FROM_EMAIL"),
            "request": request,
            "email_template_name": "registration/password_reset_email.html",
            "html_email_template_name": "registration/password_reset_email.html",
        }

        if request:
            # Hack: Temporarily replace HTTP_HOST with Frontend domain
            # Reason: Django generates links based on the request host. We need the link to point to the Frontend.
            # 중요: HTTP_HOST를 프론트엔드 도메인으로 일시 교체
            # 이유: Django는 요청 호스트를 기반으로 링크를 생성하는데, 우리는 링크가 프론트엔드를 가리켜야 함.
            original_host = request.META.get("HTTP_HOST")
            request.META["HTTP_HOST"] = frontend_domain

            try:
                self.reset_form.save(**opts)
            finally:
                # Restore original host
                # 원래 호스트로 복구
                request.META["HTTP_HOST"] = original_host
        else:
            self.reset_form.save(**opts)


class CustomPasswordResetConfirmSerializer(PasswordResetConfirmSerializer):
    """
    Serializer for confirming password reset.
    Decodes UID and validates the token.

    비밀번호 재설정 확인 시리얼라이저.
    UID를 디코딩하고 토큰의 유효성을 검증합니다.
    """

    def validate(self, attrs):
        uid = attrs.get("uid")
        token = attrs.get("token")

        try:
            decoded_pk = force_str(urlsafe_base64_decode(uid))
            User = get_user_model()
            self.user = User.objects.get(pk=decoded_pk)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise ValidationError({"uid": ["유효하지 않은 유저 ID입니다."]})

        # Check if token is valid for the specific user
        # 해당 사용자에 대한 토큰이 유효한지 검증
        if not default_token_generator.check_token(self.user, token):
            raise ValidationError({"token": ["유효하지 않거나 만료된 토큰입니다."]})

        return attrs

    def save(self):
        self.user.set_password(self.validated_data["new_password1"])
        self.user.save()
        return self.user
