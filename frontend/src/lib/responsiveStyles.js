/**
 * Responsive Style Patterns
 * 반응형 스타일 패턴 상수 모음
 *
 * 프로젝트 전체에서 일관된 반응형 디자인을 위한 공통 클래스 패턴
 */

// Container Padding Patterns
// 컨테이너 패딩 패턴
export const RESPONSIVE_PADDING = {
  sm: "px-3 md:px-4 lg:px-5",
  md: "px-4 md:px-6 lg:px-8",
  lg: "px-6 md:px-8 lg:px-10",
  y: {
    sm: "py-3 md:py-4 lg:py-5",
    md: "py-4 md:py-6 lg:py-8",
    lg: "py-6 md:py-8 lg:py-10",
  },
  all: {
    sm: "p-3 md:p-4 lg:p-5",
    md: "p-4 md:p-6 lg:p-8",
    lg: "p-6 md:p-8 lg:p-10",
  },
};

// Grid Layout Patterns
// 그리드 레이아웃 패턴
export const RESPONSIVE_GRID = {
  cols2: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6",
  cols3: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6",
  cols4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6",
  auto: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6",
};

// Text Size Patterns
// 텍스트 크기 패턴
export const RESPONSIVE_TEXT = {
  xs: "text-xs sm:text-sm",
  sm: "text-sm sm:text-base",
  base: "text-sm md:text-base lg:text-lg",
  lg: "text-base md:text-lg lg:text-xl",
  xl: "text-lg md:text-xl lg:text-2xl",
  "2xl": "text-xl md:text-2xl lg:text-3xl",
  title: "text-xl md:text-2xl lg:text-3xl font-bold",
};

// Gap Patterns
// 간격 패턴
export const RESPONSIVE_GAP = {
  sm: "gap-2 md:gap-3 lg:gap-4",
  md: "gap-3 md:gap-4 lg:gap-6",
  lg: "gap-4 md:gap-6 lg:gap-8",
};

// Flex Layout Patterns
// Flex 레이아웃 패턴
export const RESPONSIVE_FLEX = {
  col: "flex flex-col",
  colToRow: "flex flex-col md:flex-row",
  colToRowLg: "flex flex-col lg:flex-row",
  rowToCol: "flex flex-row md:flex-col",
  center: "flex items-center justify-center",
  between: "flex items-center justify-between",
  betweenCol:
    "flex flex-col md:flex-row items-start md:items-center justify-between",
};

// Width Patterns
// 너비 패턴
export const RESPONSIVE_WIDTH = {
  full: "w-full",
  auto: "w-full sm:w-auto",
  half: "w-full md:w-1/2",
  oneThird: "w-full md:w-1/3",
  twoThirds: "w-full md:w-2/3",
};

// Height Patterns
// 높이 패턴
export const RESPONSIVE_HEIGHT = {
  auto: "h-auto",
  screen: "h-screen",
  chart: "h-48 sm:h-56 md:h-64 lg:h-80",
  modal: "max-h-[90vh]",
};

// Modal/Card Patterns
// 모달/카드 패턴
export const RESPONSIVE_MODAL = {
  container: "w-full max-w-sm mx-4 sm:max-w-md md:max-w-lg lg:max-w-xl",
  containerLg:
    "w-full max-w-md mx-4 sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl",
  padding: "p-4 sm:p-6 md:p-8",
  maxHeight: "max-h-[85vh] sm:max-h-[90vh] overflow-y-auto",
};

// Button Patterns
// 버튼 패턴
export const RESPONSIVE_BUTTON = {
  base: "px-3 py-2 text-sm md:px-4 md:py-2.5 md:text-base",
  full: "w-full sm:w-auto",
  icon: "w-9 h-9 sm:w-10 sm:h-10",
};

// Table/Card Switch
// 테이블/카드 전환 패턴 (모바일에서는 숨기고 카드 표시)
export const RESPONSIVE_TABLE = {
  hideOnMobile: "hidden md:table",
  showOnMobile: "block md:hidden",
};

// Sidebar Patterns
// 사이드바 패턴
export const RESPONSIVE_SIDEBAR = {
  width: "w-64 lg:w-72",
  widthCollapsed: "w-16 lg:w-64",
  hideOnMobile: "hidden md:flex",
  showOnMobile: "flex md:hidden",
};

// Header Patterns
// 헤더 패턴
export const RESPONSIVE_HEADER = {
  height: "h-14 sm:h-16 md:h-20",
  padding: "px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-4",
};

// Notification/Dropdown Patterns
// 알림/드롭다운 패턴
export const RESPONSIVE_DROPDOWN = {
  width: "w-full max-w-sm sm:max-w-md md:max-w-lg",
  widthSm: "w-72 sm:w-80 md:w-96",
};
