from datetime import date

from rest_framework import viewsets, permissions, filters
from django.db.models import Sum
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Student,
    CourseRegistration,
    ExamStandard,
    ExamRecord,
    ExamAttachment,
    OfficialExamResult,
    Lesson,
)
from .serializers import (
    StudentSerializer,
    CourseRegistrationSerializer,
    ExamStandardSerializer,
    ExamRecordSerializer,
    ExamAttachmentSerializer,
    OfficialExamResultSerializer,
    LessonSerializer,
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


class LessonViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Lessons.
    Supports filtering by date range for calendar views.

    수업 일정 관리를 위한 ViewSet.
    캘린더 뷰를 위한 날짜 범위 필터링을 지원함.
    """

    serializer_class = LessonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only show lessons for the logged-in tutor's students
        # 로그인한 튜터 학생들의 수업만 표시
        queryset = Lesson.objects.filter(student__tutor=self.request.user)

        # Date Range Filtering (For Monthly/Weekly Calendar)
        # 날짜 범위 필터링 (월간/주간 캘린더용)
        # Usage: /api/lessons/?start_date=2024-01-01&end_date=2024-01-31
        start_date = self.request.query_params.get("start_date")
        end_date = self.request.query_params.get("end_date")

        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])

        return queryset

    @action(detail=False, methods=["get"])
    def today(self, request):
        """
        Custom Endpoint: Get lessons for today only.
        URL: /api/lessons/today/

        커스텀 엔드포인트: 오늘 날짜의 수업만 조회.
        """
        today_date = date.today()
        # Filter today's lessons and sort by start time
        # 오늘 수업 필터링 및 시작 시간순 정렬
        lessons = self.get_queryset().filter(date=today_date).order_by("start_time")
        serializer = self.get_serializer(lessons, many=True)
        return Response(serializer.data)


class DashboardStatsView(APIView):
    """
    API View for Dashboard Statistics.
    Returns aggregated data for revenue, active students, etc.
    URL: /api/dashboard/stats/

    대시보드 통계를 위한 API View.
    수익, 활성 학생 수 등의 집계 데이터를 반환함.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # 1. Active Students Count
        total_students = Student.objects.filter(tutor=user).count()

        # 2. Estimated Revenue (Sum of total_fee from ACTIVE courses)
        # 예상 수익 (활성 상태인 수강권의 총액 합계)
        revenue_data = CourseRegistration.objects.filter(
            student__tutor=user, status="ACTIVE"
        ).aggregate(Sum("total_fee"))

        estimated_revenue = revenue_data["total_fee__sum"] or 0

        # 3. Monthly Lesson Count (Current Month)
        # 이번 달 수업 횟수
        current_month = date.today().month
        monthly_lesson_count = Lesson.objects.filter(
            student__tutor=user, date__month=current_month
        ).count()

        return Response(
            {
                "total_students": total_students,
                "estimated_revenue": estimated_revenue,
                "monthly_lesson_count": monthly_lesson_count,
            }
        )
