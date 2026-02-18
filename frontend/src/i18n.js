import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import deCommon from "./locales/de/common";
import koCommon from "./locales/ko/common";

// Translation resources grouped by language
// 언어별 번역 리소스 구성
const resources = {
  de: {
    translation: deCommon,
  },
  ko: {
    translation: koCommon,
  },
};

// Initialize i18next configuration
// i18next 초기화 설정
i18n
  // Detect user language (Browser, LocalStorage, etc.)
  // 사용자 언어 감지 (브라우저, 로컬 스토리지 등)
  .use(LanguageDetector)

  // Pass the i18n instance to react-i18next
  // i18n 인스턴스를 react-i18next에 전달
  .use(initReactI18next)
  .init({
    resources,

    // Set default language to German
    // 기본 언어를 독일어로 설정
    fallbackLng: "de",

    interpolation: {
      // React already protects from XSS, so escaping is not needed
      // 리액트는 기본적으로 XSS를 방지하므로 이스케이프 설정 불필요
      escapeValue: false,
    },

    detection: {
      // Order of language detection: LocalStorage first, then Navigator
      // 언어 감지 순서: 로컬 스토리지 우선, 그 다음 브라우저 설정
      order: ["localStorage", "navigator"],

      // Cache user language choice in LocalStorage
      // 사용자의 언어 선택을 로컬 스토리지에 캐싱
      caches: ["localStorage"],
    },
  });

export default i18n;
