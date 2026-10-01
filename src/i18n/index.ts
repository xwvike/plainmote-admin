import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './en'
import zh from './zh'

export const LANGUAGES = [
  { code: 'zh', label: '简体中文', locale: 'zh-CN' },
  { code: 'en', label: 'English', locale: 'en' },
] as const

export type Language = (typeof LANGUAGES)[number]['code']

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, zh: { translation: zh } },
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'plainmote-admin.language',
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = localeOf(language)
})
document.documentElement.lang = localeOf(i18n.resolvedLanguage)

/** The BCP 47 locale used for dates and numbers in the given UI language. */
export function localeOf(language: string | undefined): string {
  return language?.startsWith('zh') ? 'zh-CN' : 'en'
}

export default i18n
