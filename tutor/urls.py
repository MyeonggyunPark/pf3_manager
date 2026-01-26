from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet,
    CourseRegistrationViewSet,
    ExamStandardViewSet,
    ExamRecordViewSet,
    ExamAttachmentViewSet,
    ExamStatsView,
    ExamDetailResultViewSet,
    ExamScoreInputViewSet,
    OfficialExamResultViewSet,
    LessonViewSet,
    DashboardStatsView,
    TodoViewSet,
    social_login_callback,
)

# Initialize DefaultRouter to automatically generate URLs for ViewSets
# ViewSet에 대한 URL을 자동 생성하기 위해 DefaultRouter를 초기화합니다
router = DefaultRouter()

# Register ViewSets with the router
# 라우터에 ViewSet 등록

# /api/students/ -> Student CRUD operations
# /api/students/ -> 학생 CRUD 작업
router.register(r"students", StudentViewSet, basename="student")

# /api/courses/ -> Course Registration CRUD operations
# /api/courses/ -> 수강 등록 CRUD 작업
router.register(r"courses", CourseRegistrationViewSet, basename="course")

# /api/exam-standards/ -> Exam Standards (ReadOnly)
# /api/exam-standards/ -> 시험 표준 정보 (읽기 전용)
router.register(r"exam-standards", ExamStandardViewSet, basename="exam-standard")

# /api/exam-records/ -> Exam Records CRUD operations
# /api/exam-records/ -> 시험 기록 CRUD 작업
router.register(r"exam-records", ExamRecordViewSet, basename="exam-record")

# /api/exam-detail-results/ -> Exam Detail Results CRUD operations
# /api/exam-detail-results/ -> 시험 상세 결과(O/X) CRUD 작업
router.register(r"exam-detail-results", ExamDetailResultViewSet, basename="exam-detail-result")

# /api/exam-score-inputs/ -> Exam Score Inputs CRUD operations
# /api/exam-score-inputs/ -> 시험 점수 입력(주관식) CRUD 작업
router.register(r"exam-score-inputs", ExamScoreInputViewSet, basename="exam-score-input")

# /api/official-results/ -> Official Exam Results CRUD operations
# /api/official-results/ -> 정규 시험 결과 CRUD 작업
router.register(r"official-results", OfficialExamResultViewSet, basename="official-result")

# /api/lessons/ -> Lesson CRUD operations
# /api/lessons/ -> 수업 일정 CRUD 작업
router.register(r"lessons", LessonViewSet, basename="lesson")

# /api/todos/ -> Todo CRUD operations
# /api/todos/ -> 투두 리스트 CRUD 작업
router.register(r"todos", TodoViewSet, basename="todo")

urlpatterns = [
    # Include all router-generated URLs
    # 라우터가 생성한 모든 URL을 포함합니다
    path("", include(router.urls)),
    
    # Dashboard Stats Endpoint
    # 대시보드 통계 엔드포인트
    path("dashboard/stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    
    # Exam Stats Endpoint
    # 시험 통계 엔드포인트
    path("exams/stats/", ExamStatsView.as_view(), name="exam-stats"),
    
    # social login callback endpoint
    # 소셜 로그인 콜백 엔드포인트
    path("social/callback/", social_login_callback, name="social_callback"),
]
