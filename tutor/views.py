from rest_framework import viewsets, permissions, filters


from .models import (
    Student,
    CourseRegistration,
    ExamStandard,
    ExamRecord,
    ExamAttachment,
    OfficialExamResult,
)
from .serializers import (
    StudentSerializer,
    CourseRegistrationSerializer,
    ExamStandardSerializer,
    ExamRecordSerializer,
    ExamAttachmentSerializer,
    OfficialExamResultSerializer,
)


class StudentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Student data.
    학생 데이터 관리를 위한 ViewSet입니다.
    """

    serializer_class = StudentSerializer
    # Ensure only authenticated users can access
    # 인증된 사용자만 접근할 수 있도록 보장합니다
    permission_classes = [permissions.IsAuthenticated]

    # Enable search functionality by name
    # 이름으로 검색하는 기능을 활성화합니다
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        """
        Limit queryset to students belonging to the logged-in tutor.
        로그인한 튜터에게 속한 학생들로 쿼리셋을 제한합니다.
        """
        return Student.objects.filter(tutor=self.request.user)

    def perform_create(self, serializer):
        """
        Automatically assign the logged-in user as the tutor when creating a student.
        학생 생성 시 로그인한 사용자를 튜터로 자동 할당합니다.
        """
        serializer.save(tutor=self.request.user)


class CourseRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Course Registrations.
    수강 등록 관리를 위한 ViewSet입니다.
    """

    serializer_class = CourseRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve registrations only for students managed by the logged-in tutor.
        로그인한 튜터가 관리하는 학생들의 수강 등록만 조회합니다.
        """
        return CourseRegistration.objects.filter(student__tutor=self.request.user)


class ExamStandardViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing Exam Standards.
    Provides read-only access to standard exam definitions.

    시험 표준 정보를 보기 위한 ViewSet입니다.
    표준 시험 정의에 대한 읽기 전용 접근을 제공합니다.
    """

    # Optimized queryset with prefetch_related to prevent N+1 problem
    # N+1 문제를 방지하기 위해 prefetch_related로 최적화된 쿼리셋
    queryset = ExamStandard.objects.prefetch_related("modules__sections").all()
    serializer_class = ExamStandardSerializer
    permission_classes = [permissions.IsAuthenticated]


class ExamRecordViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Exam Records.
    시험 기록 관리를 위한 ViewSet입니다.
    """

    serializer_class = ExamRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve exam records for the tutor's students.
        Uses select_related and prefetch_related for database performance optimization.

        튜터의 학생들에 대한 시험 기록을 조회합니다.
        데이터베이스 성능 최적화를 위해 select_related와 prefetch_related를 사용합니다.
        """
        return (
            ExamRecord.objects.filter(student__tutor=self.request.user)
            # Optimize Foreign Keys (1:1, N:1)
            # 외래 키 최적화 (1:1, N:1 관계)
            .select_related("student", "exam_standard")
            # Optimize Many-to-Many or Reverse Foreign Keys (1:N)
            # 다대다 또는 역방향 외래 키 최적화 (1:N 관계)
            .prefetch_related("attachments")
        )


class ExamAttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Exam Attachments.
    시험 첨부 파일 관리를 위한 ViewSet입니다.
    """

    serializer_class = ExamAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Ensure access only to attachments linked to the tutor's students.
        튜터의 학생들과 연결된 첨부 파일에만 접근하도록 보장합니다.
        """
        return ExamAttachment.objects.filter(
            exam_record__student__tutor=self.request.user
        )


class OfficialExamResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Official Exam Results.
    Allows CRUD operations for certification exam records.

    정규 시험 결과 관리를 위한 ViewSet입니다.
    자격증 시험 기록에 대한 CRUD(생성, 조회, 수정, 삭제) 작업을 허용합니다.
    """

    serializer_class = OfficialExamResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve official results only for students managed by the logged-in tutor.
        Optimized with select_related to reduce database queries.

        로그인한 튜터가 관리하는 학생들의 정규 시험 결과만 조회합니다.
        데이터베이스 쿼리를 줄이기 위해 select_related로 최적화되었습니다.
        """
        return (
            OfficialExamResult.objects.filter(student__tutor=self.request.user)
            # Optimize Foreign Key lookups (Student, ExamStandard)
            # 외래 키 조회 최적화 (학생, 시험 표준)
            .select_related("student", "exam_standard")
        )
