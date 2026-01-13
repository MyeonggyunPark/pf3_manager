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

    # Add 'name' field which is not in the default RegisterSerializer
    # 기본 RegisterSerializer에는 없는 'name' 필드를 명시적으로 추가합니다
    name = serializers.CharField(required=False)

    def custom_signup(self, request, user):
        """
        Override standard signup method.
        Save additional fields to the user model after successful signup.

        기본 회원가입 메서드를 오버라이드합니다.
        회원가입 성공 후, 요청 데이터에 있는 추가 필드(name)를 유저 모델에 저장합니다.
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

    class Meta:
        model = ExamScoreInput
        fields = "__all__"


class ExamDetailResultSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed question results (O/X).
    문항별 상세 결과(O/X 데이터)를 위한 시리얼라이저입니다.
    """

    class Meta:
        model = ExamDetailResult
        fields = "__all__"


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

    # Nested Serializers (Inverse Relations)
    # Used for displaying all related data in the detail view
    # 중첩 시리얼라이저 (역참조 관계)
    # 상세 보기에서 관련된 모든 하위 데이터를 표시하기 위해 사용됩니다
    attachments = ExamAttachmentSerializer(many=True, read_only=True)
    score_inputs = ExamScoreInputSerializer(many=True, read_only=True)
    detail_results = ExamDetailResultSerializer(many=True, read_only=True)

    class Meta:
        model = ExamRecord
        fields = "__all__"
        
        # Prevent tutor modification via API
        # API를 통한 튜터 정보 변조 방지
        read_only_fields = ("tutor",)


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
    student_level = serializers.CharField(
        source="student.current_level", read_only=True
    )

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

    수업(일정)을 위한 시리얼라이저입니다.
    프론트엔드 캘린더 라이브러리(FullCalendar 등) 사용을 위해 계산된 'start'와 'end' 필드를 포함합니다.
    """

    # Read-only fields for displaying related student info
    # 관련 학생 정보를 표시하기 위한 읽기 전용 필드
    student_name = serializers.CharField(source="student.name", read_only=True)
    student_level = serializers.CharField(
        source="student.current_level", read_only=True
    )

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

    class Meta:
        model = Todo
        fields = "__all__"
        read_only_fields = ("tutor",)
