from rest_framework import serializers
from dj_rest_auth.registration.serializers import RegisterSerializer
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
        # 프론트엔드에 필요한 필드만 노출합니다
        fields = ("id", "email", "name", "provider", "is_staff")
        # Prevent modification of critical fields
        # 중요한 필드의 수정 방지
        read_only_fields = ("email", "provider", "is_staff")


class CustomRegisterSerializer(RegisterSerializer):
    """
    Custom registration serializer to accept additional fields (e.g., name).
    Used in conjunction with dj-rest-auth settings in settings.py.

    추가 필드(예: 이름)를 받기 위한 커스텀 회원가입 시리얼라이저입니다.
    settings.py의 dj-rest-auth 설정과 연동하여 사용됩니다.
    """

    # Add 'name' field which is not in the default RegisterSerializer
    # 기본 RegisterSerializer에 없는 'name' 필드를 추가합니다
    name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        """
        Save additional fields to the user model after successful signup.
        회원가입 성공 후 추가 필드를 유저 모델에 저장합니다.
        """
        if "name" in request.data:
            user.name = request.data["name"]
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
    Includes logic to automatically assign the current tutor.

    학생 정보를 위한 시리얼라이저입니다.
    현재 튜터를 자동으로 할당하는 로직을 포함합니다.
    """

    # Optional: Include course history when retrieving student info (Inverse relation)
    # 선택사항: 학생 정보 조회 시 수강 이력도 함께 포함 (역참조)
    # courses = CourseRegistrationSerializer(many=True, read_only=True, source='courseregistration_set')

    class Meta:
        model = Student
        fields = "__all__"
        # Tutor is automatically assigned based on the logged-in user, so it should be read-only
        # 튜터는 로그인한 사용자를 기준으로 자동 할당되므로 읽기 전용이어야 합니다
        read_only_fields = ("tutor",)


# ==========================================
# 3. Exam Meta Data Serializers (Hierarchical)
# ==========================================
class ExamSectionSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Sections (Lowest level of exam hierarchy).
    시험 섹션(시험 계층 구조의 최하위)을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamSection
        fields = "__all__"


class ExamModuleSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Modules.
    Includes nested ExamSection data.

    시험 모듈을 위한 시리얼라이저입니다.
    중첩된 시험 섹션 데이터를 포함합니다.
    """

    # Nested Serializer: Retrieve sections belonging to this module
    # 중첩 시리얼라이저: 이 모듈에 속한 섹션들을 조회합니다
    sections = ExamSectionSerializer(many=True, read_only=True, source="sections")

    class Meta:
        model = ExamModule
        fields = "__all__"


class ExamStandardSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam Standards (Highest level of exam hierarchy).
    Includes nested ExamModule data.

    시험 표준(시험 계층 구조의 최상위)을 위한 시리얼라이저입니다.
    중첩된 시험 모듈 데이터를 포함합니다.
    """

    # Nested Serializer: Retrieve modules belonging to this standard
    # 중첩 시리얼라이저: 이 표준에 속한 모듈들을 조회합니다
    modules = ExamModuleSerializer(many=True, read_only=True, source="modules")

    class Meta:
        model = ExamStandard
        fields = "__all__"


# ==========================================
# 4. Exam Records & Results Serializers
# ==========================================
class ExamAttachmentSerializer(serializers.ModelSerializer):
    """
    Serializer for Exam file attachments.
    시험 첨부 파일을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamAttachment
        fields = "__all__"


class ExamScoreInputSerializer(serializers.ModelSerializer):
    """
    Serializer for manual score inputs (e.g., Writing/Speaking).
    수동 점수 입력(예: 쓰기/말하기)을 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamScoreInput
        fields = "__all__"


class ExamDetailResultSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed question results (O/X).
    문항별 상세 결과(O/X)를 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamDetailResult
        fields = "__all__"


class ExamRecordSerializer(serializers.ModelSerializer):
    """
    Serializer for the main Exam Record.
    Includes nested data for attachments, score inputs, and detailed results.

    메인 시험 기록을 위한 시리얼라이저입니다.
    첨부 파일, 점수 입력, 상세 결과에 대한 중첩 데이터를 포함합니다.
    """

    # Read-only fields for UI (Names instead of IDs)
    # UI를 위한 읽기 전용 필드 (ID 대신 이름 표시)
    student_name = serializers.CharField(source="student.name", read_only=True)
    exam_name = serializers.CharField(source="exam_standard.name", read_only=True)

    # Nested Serializers (Inverse Relations)
    # 중첩 시리얼라이저 (역참조 관계)
    # Attachments (Scanned papers)
    # 첨부 파일 (스캔된 시험지)
    attachments = ExamAttachmentSerializer(many=True, read_only=True)

    # Writing/Speaking Scores
    # 쓰기/말하기 점수 데이터
    score_inputs = ExamScoreInputSerializer(many=True, read_only=True)

    # Reading/Listening O/X Results
    # 읽기/듣기 O/X 결과 데이터
    detail_results = ExamDetailResultSerializer(many=True, read_only=True)

    class Meta:
        model = ExamRecord
        fields = "__all__"
        read_only_fields = ("tutor",)


# ==========================================
# 5. Official Exam Results Serializers
# ==========================================
class OfficialExamResultSerializer(serializers.ModelSerializer):
    """
    Serializer for Official Exam Results.
    Handles data conversion for certification exams like Telc or Goethe.

    정규 시험 결과를 위한 시리얼라이저입니다.
    Telc나 Goethe 같은 자격증 시험의 데이터 변환을 처리합니다.
    """

    # Read-only field to display the exam standard name for better readability
    # 가독성을 높이기 위해 시험 표준 이름을 표시하는 읽기 전용 필드
    exam_standard_name = serializers.CharField(
        source="exam_standard.name", read_only=True
    )

    # Read-only field to display student name
    # 학생 이름을 표시하는 읽기 전용 필드
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = OfficialExamResult
        fields = "__all__"


# ==========================================
# 6. Schedule Serializers
# ==========================================
class LessonSerializer(serializers.ModelSerializer):
    """
    Serializer for Lesson (Schedule).
    Includes computed fields 'start' and 'end' for frontend calendar libraries.

    수업(일정)을 위한 시리얼라이저.
    프론트엔드 캘린더 라이브러리를 위해 계산된 'start'와 'end' 필드를 포함함.
    """

    student_name = serializers.CharField(source="student.name", read_only=True)

    # Computed fields for Calendar UI (ISO Format: "YYYY-MM-DDTHH:MM:SS")
    # 캘린더 UI를 위한 계산된 필드
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()

    class Meta:
        model = Lesson  # models.py에 Lesson 추가 후 import 확인 필요
        fields = "__all__"

    def get_start(self, obj):
        return f"{obj.date}T{obj.start_time}"

    def get_end(self, obj):
        return f"{obj.date}T{obj.end_time}"
