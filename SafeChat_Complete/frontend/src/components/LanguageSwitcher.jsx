import { useT } from "../i18n/LanguageContext";

function LanguageSwitcher({ className = "" }) {
  const { lang, setLang, languages, t } = useT();
  return (
    <select
      className={`lang-switcher ${className}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label={t("language")}
      title={t("language")}
    >
      {Object.entries(languages).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
}

export default LanguageSwitcher;
