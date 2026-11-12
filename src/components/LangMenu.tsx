import { LANGS, isLang, t, type Lang } from '../i18n/index.ts'

interface Props {
  lang: Lang
  onChange: (lang: Lang) => void
}

/** English / 한국어 selector. The parent saves the choice. */
export function LangMenu({ lang, onChange }: Props) {
  return (
    <label className="lang-menu">
      <span>{t(lang, 'lang.label')}</span>
      <select
        value={lang}
        onChange={(event) => {
          if (isLang(event.target.value)) onChange(event.target.value)
        }}
      >
        {LANGS.map((code) => (
          <option key={code} value={code}>
            {t(lang, code === 'en' ? 'lang.en' : 'lang.ko')}
          </option>
        ))}
      </select>
    </label>
  )
}
