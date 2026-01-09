// Formats a date object to 'YYYY-MM-DD' string for backend API.
// 백엔드 API 전송용 'YYYY-MM-DD' 문자열로 날짜를 변환
export const getFormattedDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Returns an array of dates from Monday to Sunday for the week containing the baseDate.
// 기준 날짜가 포함된 주의 월요일부터 일요일까지의 날짜 배열을 반환
export const getWeekDays = (baseDate) => {
  // Sunday(0) -> 7
  const current = new Date(baseDate);
  const day = current.getDay() || 7;
  // Move to Monday
  if (day !== 1) current.setDate(current.getDate() - (day - 1));

  const week = [];
  for (let i = 0; i < 7; i++) {
    week.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return week;
};

// Generates a calendar grid for a specific month (Monday start).
// 특정 월의 달력 그리드 데이터를 생성합니다 (월요일 시작 기준).
export const getMonthCalendar = (baseDate) => {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const days = [];

  // Fill empty slots before the first day of the month
  // 월의 1일 이전 빈 칸 채우기
  let startDay = firstDay.getDay() || 7;
  for (let i = 1; i < startDay; i++) {
    days.push(null);
  }

  // Fill valid dates
  // 유효한 날짜 채우기
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  return days;
};
