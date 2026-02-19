
import { useAuth } from '../contexts/AuthContext';
import { EN } from '../locales/en';
import { ES } from '../locales/es';
import { JA } from '../locales/ja';
import { KO } from '../locales/ko';
import { ID } from '../locales/id';
import { TH } from '../locales/th';
import { CA } from '../locales/ca';
import { EU } from '../locales/eu';
import { DE } from '../locales/de';
import { FR } from '../locales/fr';
import { NL } from '../locales/nl';
import { PL } from '../locales/pl';
import { PT } from '../locales/pt';

const LANGUAGES: Record<string, any> = { EN, ES, JA, KO, ID, TH, CA, EU, DE, FR, NL, PL, PT };

// Type inference from English locale (Default)
type TranslationKey = keyof typeof EN;

export const useTranslation = () => {
    const { user } = useAuth();
    const lang = user?.language || 'EN';

    const t = (key: TranslationKey | string): string => {
        const dict = LANGUAGES[lang] || EN;
        const val = dict[key];
        return val || (EN as any)[key] || key;
    };

    return { t };
};
