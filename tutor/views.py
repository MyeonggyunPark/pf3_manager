import json
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.shortcuts import redirect
from django.conf import settings
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Avg, Q
from django.db.models.functions import TruncMonth
from django.db import transaction
from django.template.loader import render_to_string
from django.http import HttpResponse

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.kakao.views import KakaoOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client

from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from dj_rest_auth.views import UserDetailsView, LoginView
from dj_rest_auth.registration.views import (
    RegisterView,
    VerifyEmailView,
    SocialLoginView,
)

from weasyprint import HTML

from .models import (
    Student,
    CourseRegistration,
    ExamStandard,
    ExamRecord,
    ExamAttachment,
    ExamDetailResult,
    ExamScoreInput,
    OfficialExamResult,
    Lesson,
    Todo,
    BusinessProfile,
    Invoice,
    InvoiceAdjustment,
)

from .serializers import (
    StudentSerializer,
    CourseRegistrationSerializer,
    ExamStandardSerializer,
    ExamRecordSerializer,
    ExamAttachmentSerializer,
    ExamDetailResultSerializer,
    ExamScoreInputSerializer,
    OfficialExamResultSerializer,
    LessonSerializer,
    TodoSerializer,
    BusinessProfileSerializer,
    InvoiceSerializer,
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

    # Enable search functionality by name and filtering by fields
    # 'filter_backends' activates search and exact filtering
    # 이름 검색 및 필드 필터링 기능을 활성화
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]

    search_fields = ["name"]

    # Allow filtering by 'status' and 'target_level'
    # Useful for grouping students by proficiency in the frontend
    # 'status' 및 'target_level' 필드를 기준으로 필터링을 허용
    # 프론트엔드에서 숙련도별로 학생을 그룹화할 때 유용함
    filterset_fields = ["status", "target_level"]

    def get_queryset(self):
        """
        Limit queryset to students belonging to the logged-in tutor.
        로그인한 튜터에게 속한 학생들로 쿼리셋을 제한합니다.
        """
        return Student.objects.filter(tutor=self.request.user).order_by("name")

    def perform_create(self, serializer):
        """
        Automatically assign the logged-in user as the tutor when creating a student.
        This overrides the default create behavior to inject the user.

        학생 생성 시 로그인한 사용자를 튜터로 자동 할당합니다.
        기본 생성 동작을 오버라이드하여 현재 사용자를 주입합니다.
        """
        serializer.save(tutor=self.request.user)


class CourseRegistrationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Course Registrations.
    수강 등록 관리를 위한 ViewSet입니다.
    """

    serializer_class = CourseRegistrationSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Allow filtering by payment status and student
    # 'student' filter added to retrieve history for a specific student
    # 납부 상태 및 특정 학생에 따른 필터링을 허용
    # 특정 학생의 수강 이력을 조회하기 위해 'student' 필터 추가됨
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_paid", "student"]

    # Enable search functionality by student name
    # 학생 이름으로 검색 기능을 활성화
    search_fields = ["student__name"]

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
    # 'modules__sections' fetches related modules and sections in separate queries
    # N+1 문제를 방지하기 위해 prefetch_related로 최적화된 쿼리셋
    # 'modules__sections'는 관련된 모듈과 섹션을 별도의 쿼리로 미리 가져옵니다
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

    filter_backends = [DjangoFilterBackend]

    # Define detailed filtering options including date components (year, month)
    # Useful for filtering records within a specific period in the frontend
    # 날짜 구성 요소(연, 월)를 포함한 상세 필터링 옵션 정의
    # 프론트엔드에서 특정 기간 내의 기록을 필터링할 때 유용함
    filterset_fields = {
        "student": ["exact"],
        "exam_date": ["exact", "year", "month"],
        "exam_mode": ["exact"],
    }

    def get_queryset(self):
        """
        Retrieve exam records for the tutor's students.
        Uses select_related and prefetch_related for database performance optimization.

        튜터의 학생들에 대한 시험 기록을 조회합니다.
        데이터베이스 성능 최적화를 위해 select_related와 prefetch_related를 사용합니다.
        """
        return (
            ExamRecord.objects.filter(student__tutor=self.request.user)
            
            # Optimize Foreign Keys (1:1, N:1): Uses JOIN in SQL
            # 외래 키 최적화 (1:1, N:1 관계): SQL에서 JOIN을 사용합니다
            .select_related("student", "exam_standard")
            
            # Optimize Many-to-Many or Reverse Foreign Keys (1:N): Uses separate queries
            # 다대다 또는 역방향 외래 키 최적화 (1:N 관계): 별도의 쿼리를 사용합니다
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
        Traverses relationships: ExamAttachment -> ExamRecord -> Student -> Tutor

        튜터의 학생들과 연결된 첨부 파일에만 접근하도록 보장합니다.
        관계 탐색: ExamAttachment -> ExamRecord -> Student -> Tutor
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

    # Added 'exam_mode' to allow filtering by exam type (Full/Written/Oral)
    # Crucial for analyzing partial pass statuses
    # 시험 유형(전체/필기/구술)별 필터링을 위해 'exam_mode' 추가
    # 부분 합격 현황을 분석하는 데 필수적임
    filter_backends = [DjangoFilterBackend]

    # Expanded filtering capabilities to support exact matches and date parts
    # 정확한 일치 및 날짜 부분 지원을 위해 필터링 기능 확장
    filterset_fields = {
        "student": ["exact"],
        "status": ["exact"],
        "exam_mode": ["exact"],
        "exam_date": ["exact", "year", "month"],
    }

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
        """
        Retrieve lessons for the tutor's students.
        Supports optional date range filtering via query parameters.

        튜터의 학생들에 대한 수업을 조회합니다.
        쿼리 매개변수를 통한 선택적 날짜 범위 필터링을 지원함.
        """

        # Eager load 'student' to avoid N+1 queries when serializing student names
        # 학생 이름을 시리얼라이즈할 때 N+1 쿼리를 방지하기 위해 'student'를 미리 로드(Eager load)합니다
        queryset = Lesson.objects.filter(
            student__tutor=self.request.user
        ).select_related("student")

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
    Calculates revenue based on monthly Course Registrations.
    URL: /api/dashboard/stats/

    대시보드 통계 API.
    월별 수강 등록(CourseRegistration)을 기준으로 수익을 계산함.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        now = timezone.now()
        today = timezone.localdate(now)

        # Base Query: This month's registrations for this tutor
        # 매달에 수강권을 등록하므로 start_date 기준 필터링
        monthly_registrations = CourseRegistration.objects.filter(
            student__tutor=user, start_date__year=now.year, start_date__month=now.month
        )

        # Estimated Revenue (Total Fee of ALL registrations this month)
        # aggregate() performs calculation in the DB, returning a dictionary
        # 예상 수익: 입금 여부와 상관없이 이번 달 생성된 모든 수강권의 금액 합계
        # aggregate()는 DB에서 계산을 수행하고 딕셔너리를 반환합니다
        estimated_revenue = (
            monthly_registrations.aggregate(total=Sum("total_fee"))["total"] or 0
        )

        # Current Revenue (Total Fee of PAID registrations this month)
        # 현재(확정) 수익: 이번 달 수강권 중 'is_paid=True'인 것들의 합계
        current_revenue = (
            monthly_registrations.filter(is_paid=True).aggregate(
                total=Sum("total_fee")
            )["total"]
            or 0
        )

        # Active Students Count
        # 학생의 수강 상태가 'ACTIVE'인 학생만 카운트
        active_students = Student.objects.filter(tutor=user, status="ACTIVE").count()

        # Monthly Lesson Count
        # 이번 달 수업 수
        monthly_lesson_count = Lesson.objects.filter(
            student__tutor=user, date__year=now.year, date__month=now.month
        ).count()

        # Calculate tomorrow's date and retrieve lessons for that day
        # 내일 날짜를 계산하고 해당 날짜의 수업을 조회
        tomorrow = today + timedelta(days=1)
        tomorrow_lessons_queryset = (
            Lesson.objects.filter(student__tutor=user, date=tomorrow)
            
            # Optimize DB query using select_related for Foreign Keys
            # 외래 키에 대한 DB 쿼리를 select_related를 사용하여 최적화합니다
            .select_related("student").order_by("start_time")
        )

        # Serialize tomorrow's lesson data
        # 내일 수업 데이터를 시리얼라이즈
        tomorrow_lessons_data = LessonSerializer(
            tomorrow_lessons_queryset, many=True
        ).data

        return Response(
            {
                "estimated_revenue": estimated_revenue,
                "current_revenue": current_revenue,
                "active_students": active_students,
                "monthly_lesson_count": monthly_lesson_count,
                "tomorrow_lessons": tomorrow_lessons_data,
            }
        )


class TodoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Todos.
    Allows Tutors to manage their own tasks with advanced filtering and sorting.

    투두 관리를 위한 ViewSet.
    튜터가 자신의 할 일을 관리할 수 있도록 함.
    필터링(우선순위, 카테고리) 및 정렬 기능을 포함.
    """

    serializer_class = TodoSerializer
    permission_classes = [permissions.IsAuthenticated]

    # Add OrderingFilter and SearchFilter
    # 정렬(Ordering)과 검색(Search) 기능을 위한 백엔드 추가
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter,
    ]

    # Enable filtering by new fields
    # 완료 여부뿐만 아니라 중요도(priority)와 카테고리(category)로도 필터링 가능하게 설정
    filterset_fields = ["is_completed", "priority", "category"]

    # Fields allowed for ordering
    # 정렬 가능한 필드 정의 (중요도순, 마감일순, 생성일순)
    ordering_fields = ["priority", "due_date", "created_at"]

    # Enable search by content
    # 할 일 내용으로 검색 가능
    search_fields = ["content"]

    def get_queryset(self):
        """
        Retrieve todos only for the logged-in tutor.
        로그인한 튜터의 투두만 조회
        """
        return Todo.objects.filter(tutor=self.request.user)

    def perform_create(self, serializer):
        """
        Assign the logged-in user as the owner of the todo.
        로그인한 사용자를 투두의 소유자로 할당
        """
        serializer.save(tutor=self.request.user)


class ExamStatsView(APIView):
    """
    API View for Exam Statistics.
    Aggregates data for both Official Exams and Mock Exams to provide insights.

    시험 통계 데이터를 제공하는 API View입니다.
    정규 시험과 모의고사 데이터를 집계하여 인사이트를 제공합니다.
    URL: /api/exams/stats/
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Default to current year if not specified
        # 연도 파라미터가 없으면 현재 연도를 기본값으로 사용
        year = request.query_params.get("year", datetime.now().year)

        # Filter official results for the tutor's students within the selected year
        # 선택된 연도 내 튜터 학생들의 정규 시험 결과 필터링
        official_qs = OfficialExamResult.objects.filter(
            student__tutor=user, exam_date__year=year
        )

        # Calculate KPIs excluding 'WAITING' status
        # 'WAITING' 상태를 제외하고 KPI 계산
        off_total = official_qs.exclude(status="WAITING").count()
        off_passed = official_qs.filter(status="PASSED").count()
        off_pass_rate = round((off_passed / off_total * 100), 1) if off_total > 0 else 0

        # Aggregate pass/fail counts by target level
        # 목표 레벨별 합격/불합격 카운트 집계
        level_data = []
        level_stats = (
            official_qs.exclude(status="WAITING")
            .values("student__target_level")
            .annotate(
                passed=Count("id", filter=Q(status="PASSED")),
                failed=Count("id", filter=Q(status="FAILED")),
            )
            .order_by("student__target_level")
        )
        for entry in level_stats:
            if entry["student__target_level"]:
                level_data.append(
                    {
                        "level": entry["student__target_level"],
                        "passed": entry["passed"],
                        "failed": entry["failed"],
                    }
                )

        mock_qs = ExamRecord.objects.filter(student__tutor=user, exam_date__year=year)

        # [KPI] Calculate Total Average Score across all mock exams
        # [KPI] 모든 모의고사에 대한 전체 평균 점수 계산
        mock_avg_agg = mock_qs.aggregate(avg=Avg("total_score"))
        mock_avg_score = round(mock_avg_agg["avg"] or 0, 1)

        # [Chart 1] Monthly Average Score Trend using TruncMonth
        # Group mock exam records by month and calculate average score
        # [Chart 1] TruncMonth를 이용한 월별 평균 점수 추이 분석
        # 모의고사 기록을 월별로 그룹화하여 평균 점수 산출
        mock_trend = (
            mock_qs.annotate(month=TruncMonth("exam_date"))
            .values("month")
            .annotate(avg_score=Avg("total_score"))
            .order_by("month")
        )

        trend_data = []
        for entry in mock_trend:
            trend_data.append(
                {
                    "month": entry["month"].strftime("%-m월"),
                    "avg_score": round(entry["avg_score"] or 0, 1),
                }
            )

        # [Chart 2] Weakness Analysis by Category
        # Analyze which exam sections have the lowest accuracy
        # [Chart 2] 카테고리별 취약점 분석
        # 정답률이 가장 낮은 시험 영역(섹션)을 분석하여 취약점 도출
        weakness_qs = ExamDetailResult.objects.filter(
            exam_record__student__tutor=user, exam_record__exam_date__year=year
        )

        # Aggregate correct answers vs total questions per category
        # Uses conditional aggregation (filter inside Count)
        # 카테고리별 전체 문항 수 대비 정답 수 집계
        # 조건부 집계(Count 내부 필터)를 사용하여 한 번의 쿼리로 처리
        category_stats = (
            weakness_qs.values("exam_section__category")
            .annotate(
                total_questions=Count("id"),
                correct_answers=Count("id", filter=Q(is_correct=True)),
            )
            .order_by("exam_section__category")
        )

        category_data = []
        lowest_category = "-"
        lowest_acc = 100

        for entry in category_stats:
            category = entry["exam_section__category"]
            if not category:
                continue

            total = entry["total_questions"]
            correct = entry["correct_answers"]
            accuracy = round((correct / total * 100), 1) if total > 0 else 0

            # Identify the category with the lowest accuracy for KPI
            # KPI를 위해 정답률이 가장 낮은 카테고리 식별
            if accuracy < lowest_acc:
                lowest_acc = accuracy
                lowest_category = category

            category_data.append(
                {
                    "category": category,
                    "accuracy": accuracy,
                    "fullMark": 100,
                }
            )

        # Handle case where no data exists to avoid incorrect KPI display
        # 데이터가 없을 경우 잘못된 KPI 표시를 방지하기 위한 처리
        if lowest_category == "-":
            lowest_acc = 0

        return Response(
            {
                "official": {
                    "kpi": {
                        "total": off_total,
                        "pass_rate": off_pass_rate,
                        "passed_count": off_passed,
                    },
                    "chart": level_data,
                },
                "mock": {
                    "kpi": {
                        "avg_score": mock_avg_score,
                        "weakest_category": lowest_category,
                        "weakest_score": lowest_acc,
                    },
                    "trend_chart": trend_data,
                    "weakness_chart": category_data,
                },
            }
        )


class ExamDetailResultViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing detailed exam results (O/X).
    Handles creation and updates of individual question results.

    시험 문항별 상세 결과(O/X)를 관리하는 ViewSet입니다.
    개별 문항 결과의 생성 및 수정을 처리합니다.
    """

    serializer_class = ExamDetailResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    # 대량 생성을 위한 필터링 등은 필요 시 추가, 기본 CRUD만 있어도 됨
    def get_queryset(self):
        """
        Retrieve detailed results only for the logged-in tutor's students.
        로그인한 튜터가 관리하는 학생들의 상세 결과만 조회합니다.
        """

        return ExamDetailResult.objects.filter(
            exam_record__student__tutor=self.request.user
        )

    def create(self, request, *args, **kwargs):
        """
        Create or update a detail result record.
        Uses 'update_or_create' to ensure idempotency (safe to retry requests).

        상세 결과 기록을 생성하거나 수정합니다.
        'update_or_create'를 사용하여 멱등성을 보장합니다 (중복 요청이 와도 데이터 무결성 유지).
        """

        data = request.data

        # Perform update if exists based on unique constraint fields, otherwise create
        # 유니크 제약 조건 필드(기록ID, 섹션ID, 문제번호)를 기준으로 존재하면 수정, 없으면 생성
        obj, created = ExamDetailResult.objects.update_or_create(
            exam_record_id=data.get("exam_record"),
            exam_section_id=data.get("exam_section"),
            question_number=data.get("question_number"),
            defaults={"is_correct": data.get("is_correct")},
        )

        # Return the serialized data with appropriate status code
        # 적절한 상태 코드와 함께 시리얼라이즈된 데이터 반환
        serializer = self.get_serializer(obj)
        status_code = 201 if created else 200
        return Response(serializer.data, status=status_code)


class ExamScoreInputViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing subjective score inputs.
    Handles scores for Writing/Speaking sections where partial points are possible.

    주관식 영역(쓰기/말하기) 점수 입력을 관리하는 ViewSet입니다.
    부분 점수가 가능한 쓰기/말하기 영역의 점수를 처리합니다.
    """

    serializer_class = ExamScoreInputSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve score inputs only for the logged-in tutor's students.
        Ensures tutors can only access data related to their own students.

        로그인한 튜터가 관리하는 학생들의 점수 입력만 조회합니다.
        튜터가 자신의 학생 데이터에만 접근할 수 있도록 보장합니다.
        """

        return ExamScoreInput.objects.filter(
            exam_record__student__tutor=self.request.user
        )

    def create(self, request, *args, **kwargs):
        """
        Create or update a score input record.
        Ensures only one score record exists per section per exam record.

        점수 입력 기록을 생성하거나 수정합니다.
        시험 기록당 섹션별로 하나의 점수 기록만 존재하도록 보장합니다.
        """

        data = request.data

        # Update existing score or create a new one
        # 기존 점수를 업데이트하거나 새로 생성
        obj, created = ExamScoreInput.objects.update_or_create(
            exam_record_id=data.get("exam_record"),
            exam_section_id=data.get("exam_section"),
            defaults={"score": data.get("score")},
        )

        # Return response
        # 결과 반환
        serializer = self.get_serializer(obj)
        status_code = 201 if created else 200
        return Response(serializer.data, status=status_code)


class CustomRegisterView(RegisterView):
    """
    Custom Register View to bypass authentication checks.
    Fixes 'User not found' error when a deleted user tries to sign up again
    with a stale cookie still in the browser.

    인증 검사를 우회하는 커스텀 회원가입 뷰.
    계정이 삭제된 유저가 브라우저에 남은 만료된 쿠키를 가지고 재가입을 시도할 때
    발생하는 'User not found' 401 에러를 방지합니다.
    """

    authentication_classes = []


class CustomVerifyEmailView(VerifyEmailView):
    """
    Custom Verify Email View to bypass authentication checks.
    Prevents 'User not found' 401 error caused by stale cookies from deleted accounts.

    인증 검사를 우회하는 커스텀 이메일 인증 뷰.
    삭제된 계정의 만료된 쿠키로 인해 발생하는 'User not found' 401 에러를 방지합니다.
    """

    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class CustomUserDetailsView(UserDetailsView):
    """
    Custom User Details View.
    Extends dj_rest_auth's UserDetailsView to support DELETE method.

    커스텀 유저 상세 정보 뷰.
    dj_rest_auth의 UserDetailsView를 상속받아 DELETE(회원탈퇴) 기능을 지원합니다.
    """

    def delete(self, request, *args, **kwargs):
        """
        Handle DELETE request to delete the user account.
        계정 삭제 요청(DELETE)을 처리합니다.
        """
        user = self.request.user

        if user.is_authenticated:
            user.delete()
            response = Response(
                {"detail": "계정이 성공적으로 삭제되었습니다."},
                status=status.HTTP_204_NO_CONTENT,
            )

            response.delete_cookie(settings.REST_AUTH["JWT_AUTH_COOKIE"])
            response.delete_cookie(settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"])

            return response

        return Response(
            {"detail": "인증되지 않은 사용자입니다."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class CustomLoginView(LoginView):
    """
    Custom Login View to bypass authentication checks.
    Fixes 'User not found' 401 error when a user with a stale cookie (from a deleted account)
    tries to log in.

    인증 검사를 우회하는 커스텀 로그인 뷰.
    삭제된 계정의 만료된 쿠키를 가진 유저가 로그인할 때 발생하는 'User not found' 에러를 방지합니다.
    기존 세션/쿠키를 무시하고 새로운 로그인 자격 증명만 확인합니다.
    """

    authentication_classes = []


class BusinessProfileDetailView(APIView):
    """
    API View for retrieving and updating Business Profile.
    Handles 'Upsert' (Update or Insert) logic and Logo deletion.

    사업자 프로필 조회 및 수정을 위한 API View.
    'Upsert' (수정 또는 생성) 로직과 로고 삭제 처리를 담당함.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """
        Retrieve the Business Profile for the logged-in user.
        Returns 404 if not found (Frontend interprets this as Create Mode).

        로그인한 사용자의 사업자 프로필을 조회함.
        없으면 404 반환 (프론트엔드에서 이를 생성 모드로 인식함).
        """
        try:
            profile = BusinessProfile.objects.get(tutor=request.user)
            serializer = BusinessProfileSerializer(profile)
            return Response(serializer.data)
        except BusinessProfile.DoesNotExist:
            return Response(
                {"detail": "Business profile not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

    def post(self, request):
        """
        Create or Update Business Profile.
        Handles specific logic for logo deletion ('DELETE' string).

        사업자 프로필 생성 또는 수정.
        로고 삭제('DELETE' 문자열)에 대한 특정 로직을 처리함.
        """
        data = request.data.copy()
        user = request.user

        # Logo Deletion Logic
        # 로고 삭제 로직: 'logo' 필드로 "DELETE" 문자열이 전송된 경우
        if data.get("logo") == "DELETE":
            try:
                profile = BusinessProfile.objects.get(tutor=user)
                # Delete file from storage but keep the record
                # 저장소에서 파일은 삭제하지만 DB 레코드는 유지
                profile.logo.delete(save=False)
                profile.logo = None
                profile.save()
            except BusinessProfile.DoesNotExist:
                pass

            # Remove 'logo' key to prevent serializer validation error
            # 시리얼라이저 유효성 검사 오류 방지를 위해 'logo' 키 제거
            if "logo" in data:
                del data["logo"]

        try:
            # Update Mode
            # 수정 모드: 기존 프로필이 있으면 업데이트
            profile = BusinessProfile.objects.get(tutor=user)
            serializer = BusinessProfileSerializer(profile, data=data, partial=True)
        except BusinessProfile.DoesNotExist:
            # Create Mode
            # 생성 모드: 프로필이 없으면 새로 생성
            serializer = BusinessProfileSerializer(data=data)

        if serializer.is_valid():
            # Force assignment of the logged-in user as tutor
            # 로그인한 사용자를 튜터로 강제 할당
            serializer.save(tutor=user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Invoices.
    Handles CRUD operations, PDF generation, and sequence management.

    영수증 관리를 위한 ViewSet.
    CRUD 작업, PDF 생성 및 번호 순서 관리를 처리함.
    """

    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Retrieve invoices only for the logged-in tutor.
        로그인한 튜터의 영수증만 조회.
        """
        return Invoice.objects.filter(tutor=self.request.user)

    @action(detail=False, methods=["get"])
    def next_number(self, request):
        """
        Get the next invoice number based on BusinessProfile settings.
        Also returns the Tax Configuration (Small Business Status).
        Format: RE-{Seq}{YY}{MM} (e.g., RE-10012602)

        비즈니스 프로필 설정을 기반으로 다음 영수증 번호를 반환함.
        동시에 세금 설정(소규모 사업자 여부) 정보도 반환하여 프론트엔드 초기값을 설정함.
        """
        try:
            profile = BusinessProfile.objects.get(tutor=request.user)
            seq = profile.next_invoice_number
            now = datetime.now()
            # YYMM format
            # YYMM 포맷 (예: 2602)
            yymm = now.strftime("%y%m")
            full_code = f"RE-{seq}{yymm}"

            return Response(
                {
                    "next_number": full_code,
                    "sequence": seq,
                    "yymm": yymm,
                    # Return tax settings for frontend logic
                    # 프론트엔드 로직(부가세 자동 설정)을 위해 세금 설정 반환
                    "tax_config": {
                        "is_small_business": profile.is_small_business,
                        "vat_rate": 0 if profile.is_small_business else 19,
                    },
                }
            )
        except BusinessProfile.DoesNotExist:
            return Response(
                {"detail": "Business profile not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def create_full(self, request):
        """
        Create a complete invoice with items.
        Generates the invoice number safely on the server side.
        Uses transaction.atomic to ensure data integrity.

        완전한 영수증 생성.
        서버 사이드에서 영수증 번호를 안전하게(중복 없이) 생성하고 저장함.
        transaction.atomic을 사용하여 데이터 무결성을 보장함.
        """
        user = request.user
        data = request.data.copy()

        try:
            # Lock the profile row to prevent race conditions on invoice number
            # 영수증 번호 동시성 문제를 방지하기 위해 프로필 행을 잠금(Lock)
            profile = BusinessProfile.objects.select_for_update().get(tutor=user)
        except BusinessProfile.DoesNotExist:
            return Response(
                {"detail": "먼저 사업자 프로필(설정)을 완료해주세요."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        seq = profile.next_invoice_number
        yymm = datetime.now().strftime("%y%m")
        full_code = f"RE-{seq}{yymm}"

        # Assign generated values
        # 생성된 값 할당
        data["invoice_number"] = seq
        data["full_invoice_code"] = full_code
        # Snapshot current profile data
        # 현재 프로필 데이터를 스냅샷으로 저장
        data["sender_data"] = BusinessProfileSerializer(profile).data

        data["is_small_business"] = profile.is_small_business

        serializer = self.get_serializer(data=data)
        if serializer.is_valid():

            invoice = serializer.save(
                tutor=user,
                invoice_number=seq,
                full_invoice_code=full_code,
                sender_data=data["sender_data"],
                is_small_business=data["is_small_business"],
            )

            # Increment sequence number safely
            # 순서 번호를 안전하게 증가
            profile.next_invoice_number += 1
            profile.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"])
    def preview_pdf(self, request):
        """
        Generate a PDF preview for the invoice without saving it.
        Uses WeasyPrint to render HTML to PDF.

        저장하지 않고 영수증 PDF 미리보기를 생성함.
        WeasyPrint를 사용하여 HTML을 PDF로 렌더링함.
        """
        if HTML is None:
            return Response(
                {"detail": "WeasyPrint library is not installed."}, status=500
            )

        data = request.data
        user = request.user

        # Helper function: Format number to German standard (e.g., 1.000,00)
        # 헬퍼 함수: 독일 표준 숫자 형식으로 변환 (예: 1.000,00)
        def format_de(value):
            if value is None:
                return "0,00"
            try:
                val = Decimal(str(value))
            except:
                return "0,00"
            s = "{:,.2f}".format(val)
            # Swap dots and commas
            # 점과 쉼표를 교체
            return s.replace(",", "X").replace(".", ",").replace("X", ".")

        # Helper function: Format date to German standard (DD.MM.YYYY)
        # 헬퍼 함수: 독일 표준 날짜 형식으로 변환 (DD.MM.YYYY)
        def format_date_de(date_str):
            if not date_str:
                return ""
            try:
                return datetime.strptime(date_str, "%Y-%m-%d").strftime("%d.%m.%Y")
            except:
                return date_str

        # Fetch Business Profile for sender data
        # 발신자 데이터 구성을 위한 비즈니스 프로필 조회
        try:
            profile = BusinessProfile.objects.get(tutor=user)
            req_small_biz = data.get("is_small_business")
            is_small_business = (
                req_small_biz
                if req_small_biz is not None
                else getattr(profile, "is_small_business", False)
            )

            sender_data = {
                "company_name": profile.company_name,
                "manager_name": profile.manager_name,
                "street": profile.street,
                "postcode": profile.postcode,
                "city": profile.city,
                "phone": profile.phone,
                "email": profile.email,
                "website": profile.website,
                "bank_name": profile.bank_name,
                "iban": profile.iban,
                "bic": profile.bic,
                "tax_number": profile.tax_number,
                "country": profile.country,
            }
        except BusinessProfile.DoesNotExist:
            sender_data = {}
            is_small_business = False

        # Parse Recipient Address
        # 수신자 주소 파싱
        try:
            recipient_address = json.loads(data.get("recipient_address", "{}"))
        except:
            recipient_address = {}

        recipient_name = data.get("recipient_name", "Unbekannt")
        recipient_no = ""
        recipient_salutation = ""
        student_id = data.get("student") or data.get("recipient_id")

        # If student is linked, fetch details for defaults
        # 학생이 연결된 경우, 기본값 설정을 위해 상세 정보 조회
        if student_id:
            try:
                student = Student.objects.get(id=student_id)

                if recipient_name == "Unbekannt":
                    recipient_name = student.billing_name or student.name

                recipient_no = student.customer_number

            except Student.DoesNotExist:
                pass

        header_text = data.get("header_text", "")

        # Infer salutation from header text if not set
        # 설정되지 않은 경우 헤더 텍스트에서 인사말 추론
        if not recipient_salutation:
            if "Frau" in header_text and "Herr" not in header_text:
                recipient_salutation = "Frau"
            elif "Herr" in header_text and "Frau" not in header_text:
                recipient_salutation = "Herr"

        recipient_data = {
            "name": recipient_name,
            "customer_no": recipient_no,
            "salutation": recipient_salutation,
            "street": recipient_address.get("street", ""),
            "zip": recipient_address.get("zip", ""),
            "city": recipient_address.get("city", ""),
            "country": recipient_address.get("country", ""),
        }

        # Process Footer Variables
        # 푸터 변수(치환자) 처리
        raw_footer = data.get("footer_text", "")
        formatted_due_date = ""
        due_date_str = data.get("due_date")

        if due_date_str:
            formatted_due_date = format_date_de(due_date_str)
            raw_footer = raw_footer.replace("[%ZAHLUNGSZIEL%]", formatted_due_date)

        raw_footer = raw_footer.replace(
            "[%KONTAKTPERSON%]", sender_data.get("manager_name", "")
        )

        # Format Dates
        # 날짜 포맷팅
        invoice_date = format_date_de(data.get("invoice_date"))
        delivery_start = format_date_de(data.get("delivery_date_start"))
        delivery_end = format_date_de(data.get("delivery_date_end"))

        delivery_text = delivery_start
        if delivery_end:
            delivery_text = f"{delivery_start} - {delivery_end}"

        # Process Items
        # 항목(Items) 처리 및 계산
        items = data.get("items", [])
        items_data = []

        items_sum_decimal = Decimal("0.00")

        UNIT_TRANS = {
            "DAY": "Tag(e)",
            "HOUR": "Std.",
            "PIECE": "Stk.",
            "FLAT_RATE": "pauschal",
        }

        for item in items:
            try:
                qty = Decimal(str(item.get("quantity", 0) or 0))
                price = Decimal(str(item.get("unit_price", 0) or 0))
                disc_val = Decimal(str(item.get("discount_value", 0) or 0))
                vat_rate = Decimal(str(item.get("vat_rate", 0) or 0))
                total_p = Decimal(str(item.get("total_price", 0) or 0))
            except:
                qty = price = disc_val = vat_rate = total_p = Decimal(0)

            items_sum_decimal += total_p

            raw_unit = item.get("unit", "PIECE")

            items_data.append(
                {
                    "description": item.get("description", ""),
                    "quantity": format_de(qty),
                    "unit_display": UNIT_TRANS.get(raw_unit, raw_unit),
                    "unit_price": format_de(price),
                    "discount_value": format_de(disc_val),
                    "discount_unit": item.get("discount_unit", "PERCENT"),
                    "vat_rate": format_de(vat_rate),
                    "total_price": format_de(total_p),
                }
            )

        # Process Adjustments (Discounts/Surcharges)
        # 조정 항목(할인/추가금) 처리
        adjustments_input = data.get("adjustments", [])
        processed_adjustments = []

        for adj in adjustments_input:
            try:
                val = Decimal(str(adj.get("value", 0) or 0))
                amt = Decimal(str(adj.get("amount", 0) or 0))

            except:
                val = amt = Decimal(0)

            processed_adjustments.append(
                {
                    "label": adj.get("label", ""),
                    "type": adj.get("type", "DISCOUNT"),
                    "value": format_de(val),
                    "unit": adj.get("unit", "PERCENT"),
                    "amount": format_de(amt),
                }
            )

        # Process Totals
        # 총계 처리
        try:
            subtotal = Decimal(str(data.get("subtotal", 0) or 0))
            vat_amount = Decimal(str(data.get("vat_amount", 0) or 0))
            total_amount = Decimal(str(data.get("total_amount", 0) or 0))
        except:
            subtotal = vat_amount = total_amount = Decimal(0)

        # Context for Template
        # 템플릿에 전달할 컨텍스트
        context = {
            "invoice_number": data.get("invoice_number", ""),
            "invoice_date": invoice_date,
            "delivery_date": delivery_text,
            "subject": data.get("subject", ""),
            "header_text": header_text,
            "footer_text": raw_footer,
            "sender": sender_data,
            "recipient": recipient_data,
            "items": items_data,
            "items_total": format_de(items_sum_decimal),
            "subtotal": format_de(subtotal),
            "vat_amount": format_de(vat_amount),
            "total_amount": format_de(total_amount),
            "adjustments": processed_adjustments,
            "is_small_business": is_small_business,
            "due_date": formatted_due_date,
        }

        # Render HTML and create PDF
        # HTML 렌더링 및 PDF 생성
        html_string = render_to_string("invoices/invoice_pdf.html", context)
        pdf_file = HTML(string=html_string).write_pdf()

        # Return PDF file response
        # PDF 파일 응답 반환
        response = HttpResponse(pdf_file, content_type="application/pdf")
        response["Content-Disposition"] = 'inline; filename="preview.pdf"'
        return response

    @action(detail=True, methods=["get"])
    def download_pdf(self, request, pk=None):
        """
        Download PDF for an existing invoice.
        Fetches data from the database and renders the PDF.

        기존 영수증에 대한 PDF 다운로드.
        데이터베이스에서 데이터를 가져와 PDF를 렌더링함.
        """
        if HTML is None:
            return Response(
                {"detail": "WeasyPrint library is not installed."}, status=500
            )

        invoice = self.get_object()

        # Helper: Format Number
        # 헬퍼: 숫자 포맷팅
        def format_de(value):
            if value is None:
                return "0,00"
            try:
                val = Decimal(str(value))
            except:
                return "0,00"
            s = "{:,.2f}".format(val)
            return s.replace(",", "X").replace(".", ",").replace("X", ".")

        # Helper: Format Date
        # 헬퍼: 날짜 포맷팅
        def format_date_de(d):
            if not d:
                return ""
            return d.strftime("%d.%m.%Y")

        # Use stored snapshot data if available, else fetch current profile
        # 저장된 스냅샷 데이터가 있으면 사용하고, 없으면 현재 프로필 조회
        sender_data = invoice.sender_data

        if not sender_data:
            try:
                profile = BusinessProfile.objects.get(tutor=invoice.tutor)
                sender_data = BusinessProfileSerializer(profile).data
            except BusinessProfile.DoesNotExist:
                sender_data = {}

        try:
            r_addr = json.loads(invoice.recipient_address)
        except (TypeError, json.JSONDecodeError):
            r_addr = {}

        # Determine Salutation
        # 인사말 결정
        header_text = invoice.header_text or ""
        recipient_salutation = ""
        if "Frau" in header_text and "Herr" not in header_text:
            recipient_salutation = "Frau"
        elif "Herr" in header_text and "Frau" not in header_text:
            recipient_salutation = "Herr"

        customer_no = ""
        if invoice.student and invoice.student.customer_number:
            customer_no = invoice.student.customer_number

        recipient_data = {
            "name": invoice.recipient_name,
            "salutation": recipient_salutation,
            "customer_no": customer_no,
            "street": r_addr.get("street", ""),
            "zip": r_addr.get("zip", ""),
            "city": r_addr.get("city", ""),
            "country": r_addr.get("country", ""),
        }

        # Footer Processing
        # 푸터 처리
        raw_footer = invoice.footer_text or ""
        formatted_due_date = format_date_de(invoice.due_date)
        raw_footer = raw_footer.replace("[%ZAHLUNGSZIEL%]", formatted_due_date)
        raw_footer = raw_footer.replace(
            "[%KONTAKTPERSON%]", sender_data.get("manager_name", "")
        )

        delivery_text = format_date_de(invoice.delivery_date_start)
        if invoice.delivery_date_end:
            delivery_text += f" - {format_date_de(invoice.delivery_date_end)}"

        items_data = []
        items_sum_decimal = Decimal("0.00")

        UNIT_TRANS = {
            "DAY": "Tag(e)",
            "HOUR": "Std.",
            "PIECE": "Stk.",
            "FLAT_RATE": "pauschal",
        }

        for item in invoice.items.all():
            items_sum_decimal += item.total_price

            items_data.append(
                {
                    "description": item.description,
                    "quantity": format_de(item.quantity),
                    "unit_display": UNIT_TRANS.get(item.unit, item.unit),
                    "unit_price": format_de(item.unit_price),
                    "discount_value": format_de(item.discount_value),
                    "vat_rate": format_de(item.vat_rate),
                    "total_price": format_de(item.total_price),
                    "discount_unit": item.discount_unit,
                }
            )

        processed_adjustments = []
        for adj in invoice.adjustments.all():
            processed_adjustments.append(
                {
                    "label": adj.label,
                    "type": adj.type,
                    "value": format_de(adj.value),
                    "unit": adj.unit,
                    "amount": format_de(adj.amount),
                }
            )

        context = {
            "invoice_number": invoice.full_invoice_code,
            "invoice_date": invoice.created_at.strftime("%d.%m.%Y"),
            "delivery_date": delivery_text,
            "subject": invoice.subject,
            "header_text": invoice.header_text,
            "footer_text": raw_footer,
            "sender": sender_data,
            "recipient": recipient_data,
            "items": items_data,
            "items_total": format_de(items_sum_decimal),
            "subtotal": format_de(invoice.subtotal),
            "vat_amount": format_de(invoice.vat_amount),
            "total_amount": format_de(invoice.total_amount),
            "adjustments": processed_adjustments,
            "is_small_business": invoice.is_small_business,
            "due_date": formatted_due_date,
        }

        html_string = render_to_string("invoices/invoice_pdf.html", context)
        pdf_file = HTML(string=html_string).write_pdf()

        response = HttpResponse(pdf_file, content_type="application/pdf")
        filename = f"Rechnung_{invoice.full_invoice_code}.pdf"
        response["Content-Disposition"] = f'inline; filename="{filename}"'
        return response


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([permissions.AllowAny])
def social_login_callback(request):
    """
    Callback function after successful social login via Allauth.
    Issues JWT tokens and handles redirection with New User check.

    Allauth 소셜 로그인 성공 후 호출되는 콜백 함수.
    JWT 토큰을 발급하고 신규 유저 확인 후 리다이렉션 처리.
    """
    user = request.user

    # If session cookie is missing, request.user may be anonymous.
    # Manual login is performed to ensure the user is recognized.
    # 세션 쿠키가 유실된 경우를 대비하여 수동 로그인을 시도하고 유저를 식별합니다.
    if not user.is_authenticated:
        frontend_url = getattr(
            settings, "FRONTEND_BASE_URL", "https://ms-planer.up.railway.app"
        )
        return redirect(f"{frontend_url.rstrip('/')}/login?error=auth_failed")

    # Generate JWT tokens for the authenticated user
    # 인증된 사용자를 위한 JWT 토큰(Access/Refresh) 생성
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    refresh_token = str(refresh)

    # Get the frontend base URL from settings
    # 설정 파일에서 프론트엔드 베이스 URL을 가져옴
    frontend_url = getattr(
        settings, "FRONTEND_BASE_URL", "https://ms-planer.up.railway.app"
    )
    frontend_url = frontend_url.rstrip("/")

    # Default Target URL
    # 기본 리다이렉트 URL
    target_url = f"{frontend_url}/social/success"

    # Check for New User (Joined within last 60 seconds)
    # 신규 유저 확인 (최근 60초 이내 가입)
    if user.is_authenticated:
        join_delta = timezone.now() - user.date_joined
        if join_delta < timedelta(seconds=60):
            target_url += "?new_user=true"

    # Secure redirection
    # 보안 리다이렉션
    response = redirect(target_url)

    # Define common cookie settings with an explicit path to ensure Safari compatibility.
    # We omit the domain to let the browser treat it as a host-only cookie for better acceptance.
    # Safari 호환성을 보장하기 위해 명시적인 경로와 함께 공통 쿠키 설정을 정의합니다.
    # 브라우저가 호스트 전용 쿠키로 취급하여 수락 가능성을 높이도록 도메인 설정은 생략합니다.
    cookie_kwargs = {
        "httponly": settings.REST_AUTH["JWT_AUTH_HTTPONLY"],
        "secure": settings.REST_AUTH["JWT_AUTH_SECURE"],
        "samesite": settings.REST_AUTH["JWT_AUTH_SAMESITE"],
        "path": "/",
    }

    # Set access token in HttpOnly cookie
    # HttpOnly 쿠키에 액세스 토큰 설정
    response.set_cookie(
        key=settings.REST_AUTH["JWT_AUTH_COOKIE"],
        value=access_token,
        max_age=24 * 60 * 60,
        **cookie_kwargs,
    )

    # Set refresh token in HttpOnly cookie
    # HttpOnly 쿠키에 리프레시 토큰 설정
    response.set_cookie(
        key=settings.REST_AUTH["JWT_AUTH_REFRESH_COOKIE"],
        value=refresh_token,
        max_age=7 * 24 * 60 * 60,
        **cookie_kwargs,
    )

    return response