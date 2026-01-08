from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StudentViewSet,
    CourseRegistrationViewSet,
    ExamStandardViewSet,
    ExamRecordViewSet,
    ExamAttachmentViewSet,
    OfficialExamResultViewSet,
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

# /api/attachments/ -> Exam Attachments CRUD operations
# /api/attachments/ -> 시험 첨부 파일 CRUD 작업
router.register(r"attachments", ExamAttachmentViewSet, basename="exam-attachment")

# /api/official-results/ -> Official Exam Results CRUD operations
# /api/official-results/ -> 정규 시험 결과 CRUD 작업
router.register(r"official-results", OfficialExamResultViewSet, basename="official-result")

urlpatterns = [
    # Include all router-generated URLs
    # 라우터가 생성한 모든 URL을 포함합니다
    path("", include(router.urls)),
]
