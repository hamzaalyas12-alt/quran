/**
 * Halqa Tracker - Quran Reference Data
 * Contains all 30 Paras (Juz) and 114 Surahs with Arabic and English names.
 */

export interface SurahItem {
  number: number;
  name: string;
  arabicName: string;
  englishTranslation: string;
  totalAyahs: number;
  juzStart: number;
}

export interface ParaItem {
  number: number;
  name: string;
  arabicName: string;
}

export const QURAN_PARAS: ParaItem[] = [
  { number: 1, name: 'Alif Lam Meem', arabicName: 'الم' },
  { number: 2, name: 'Sayaqool', arabicName: 'سيقول' },
  { number: 3, name: 'Tilkal Rusul', arabicName: 'تلك الرسل' },
  { number: 4, name: 'Lan Tana Loo', arabicName: 'لن تنالوا' },
  { number: 5, name: 'Wal Mohsanat', arabicName: 'والمحصنات' },
  { number: 6, name: 'La Yuhibbullah', arabicName: 'لا يحب الله' },
  { number: 7, name: 'Wa Iza Samiu', arabicName: 'وإذا سمعوا' },
  { number: 8, name: 'Wa Lau Annana', arabicName: 'ولو أننا' },
  { number: 9, name: 'Qalal Malao', arabicName: 'قال الملأ' },
  { number: 10, name: 'Wa A\'lamu', arabicName: 'واعلموا' },
  { number: 11, name: 'Yatazeroon', arabicName: 'يعتذرون' },
  { number: 12, name: 'Wa Mamin Da\'abat', arabicName: 'وما من دابة' },
  { number: 13, name: 'Wa Ma Ubrioo', arabicName: 'وما أبرئ' },
  { number: 14, name: 'Rubama', arabicName: 'ربما' },
  { number: 15, name: 'Subhanallazi', arabicName: 'سبحان الذي' },
  { number: 16, name: 'Qal Alam', arabicName: 'قال ألم' },
  { number: 17, name: 'Iqtaraba', arabicName: 'اقترب' },
  { number: 18, name: 'Qadd Aflaha', arabicName: 'قد أفلح' },
  { number: 19, name: 'Wa Qalallazina', arabicName: 'وقال الذين' },
  { number: 20, name: 'A\'man Khalaq', arabicName: 'أمن خلق' },
  { number: 21, name: 'Utlu Ma Oohiya', arabicName: 'اتل ما أوحي' },
  { number: 22, name: 'Wa Manyaqnut', arabicName: 'ومن يقنت' },
  { number: 23, name: 'Wa Mali', arabicName: 'وما لي' },
  { number: 24, name: 'Faman Azlam', arabicName: 'فمن أظلم' },
  { number: 25, name: 'Ilaihi Yuraddu', arabicName: 'إليه يرد' },
  { number: 26, name: 'Ha\'a Meem', arabicName: 'حم' },
  { number: 27, name: 'Qala Fama Khatbukum', arabicName: 'قال فما خطبكم' },
  { number: 28, name: 'Qadd Sami Allah', arabicName: 'قد سمع الله' },
  { number: 29, name: 'Tabarakallazi', arabicName: 'تبارك الذي' },
  { number: 30, name: 'Amma Yatasa\'aloon', arabicName: 'عم يتساءلون' }
];

export const POPULAR_SURAHS: SurahItem[] = [
  { number: 1, name: 'Al-Fatihah', arabicName: 'الفاتحة', englishTranslation: 'The Opening', totalAyahs: 7, juzStart: 1 },
  { number: 2, name: 'Al-Baqarah', arabicName: 'البقرة', englishTranslation: 'The Cow', totalAyahs: 286, juzStart: 1 },
  { number: 3, name: 'Ali \'Imran', arabicName: 'آل عمران', englishTranslation: 'Family of Imran', totalAyahs: 200, juzStart: 3 },
  { number: 18, name: 'Al-Kahf', arabicName: 'الكهف', englishTranslation: 'The Cave', totalAyahs: 110, juzStart: 15 },
  { number: 36, name: 'Ya-Sin', arabicName: 'يس', englishTranslation: 'Ya-Sin', totalAyahs: 83, juzStart: 22 },
  { number: 48, name: 'Al-Fath', arabicName: 'الفتح', englishTranslation: 'The Victory', totalAyahs: 29, juzStart: 26 },
  { number: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', englishTranslation: 'The Beneficent', totalAyahs: 78, juzStart: 27 },
  { number: 56, name: 'Al-Waqi\'ah', arabicName: 'الواقعة', englishTranslation: 'The Inevitable', totalAyahs: 96, juzStart: 27 },
  { number: 62, name: 'Al-Jumu\'ah', arabicName: 'الجمعة', englishTranslation: 'Friday Congregation', totalAyahs: 11, juzStart: 28 },
  { number: 66, name: 'At-Tahrim', arabicName: 'التحريم', englishTranslation: 'The Prohibition', totalAyahs: 12, juzStart: 28 },
  { number: 67, name: 'Al-Mulk', arabicName: 'الملك', englishTranslation: 'The Sovereignty', totalAyahs: 30, juzStart: 29 },
  { number: 68, name: 'Al-Qalam', arabicName: 'القلم', englishTranslation: 'The Pen', totalAyahs: 52, juzStart: 29 },
  { number: 71, name: 'Nuh', arabicName: 'نوح', englishTranslation: 'Noah', totalAyahs: 28, juzStart: 29 },
  { number: 78, name: 'An-Naba', arabicName: 'النبأ', englishTranslation: 'The Tidings', totalAyahs: 40, juzStart: 30 },
  { number: 79, name: 'An-Nazi\'at', arabicName: 'النازعات', englishTranslation: 'Those Who Drag Forth', totalAyahs: 46, juzStart: 30 },
  { number: 80, name: '\'Abasa', arabicName: 'عبس', englishTranslation: 'He Frowned', totalAyahs: 42, juzStart: 30 },
  { number: 81, name: 'At-Takwir', arabicName: 'التكوير', englishTranslation: 'The Overthrowing', totalAyahs: 29, juzStart: 30 },
  { number: 82, name: 'Al-Infitar', arabicName: 'الانفطار', englishTranslation: 'The Cleaving', totalAyahs: 19, juzStart: 30 },
  { number: 83, name: 'Al-Mutaffifin', arabicName: 'المطففين', englishTranslation: 'The Defrauding', totalAyahs: 36, juzStart: 30 },
  { number: 84, name: 'Al-Inshiqaq', arabicName: 'الانشقاق', englishTranslation: 'The Splitting Asunder', totalAyahs: 25, juzStart: 30 },
  { number: 85, name: 'Al-Buruj', arabicName: 'البروج', englishTranslation: 'The Mansions of the Stars', totalAyahs: 22, juzStart: 30 },
  { number: 86, name: 'At-Tariq', arabicName: 'الطارق', englishTranslation: 'The Morning Star', totalAyahs: 17, juzStart: 30 },
  { number: 87, name: 'Al-A\'la', arabicName: 'الأعلى', englishTranslation: 'The Most High', totalAyahs: 19, juzStart: 30 },
  { number: 88, name: 'Al-Ghashiyah', arabicName: 'الغاشية', englishTranslation: 'The Overwhelming', totalAyahs: 26, juzStart: 30 },
  { number: 89, name: 'Al-Fajr', arabicName: 'الفجر', englishTranslation: 'The Dawn', totalAyahs: 30, juzStart: 30 },
  { number: 90, name: 'Al-Balad', arabicName: 'البلد', englishTranslation: 'The City', totalAyahs: 20, juzStart: 30 },
  { number: 91, name: 'Ash-Shams', arabicName: 'الشمس', englishTranslation: 'The Sun', totalAyahs: 15, juzStart: 30 },
  { number: 92, name: 'Al-Layl', arabicName: 'الليل', englishTranslation: 'The Night', totalAyahs: 21, juzStart: 30 },
  { number: 93, name: 'Ad-Duha', arabicName: 'الضحى', englishTranslation: 'The Morning Hours', totalAyahs: 11, juzStart: 30 },
  { number: 94, name: 'Ash-Sharh', arabicName: 'الشرح', englishTranslation: 'The Relief', totalAyahs: 8, juzStart: 30 },
  { number: 95, name: 'At-Tin', arabicName: 'التين', englishTranslation: 'The Fig', totalAyahs: 8, juzStart: 30 },
  { number: 96, name: 'Al-\'Alaq', arabicName: 'العلق', englishTranslation: 'The Clot', totalAyahs: 19, juzStart: 30 },
  { number: 97, name: 'Al-Qadr', arabicName: 'القدر', englishTranslation: 'The Power', totalAyahs: 5, juzStart: 30 },
  { number: 98, name: 'Al-Bayyinah', arabicName: 'البينة', englishTranslation: 'The Clear Proof', totalAyahs: 8, juzStart: 30 },
  { number: 99, name: 'Az-Zalzalah', arabicName: 'الزلزلة', englishTranslation: 'The Earthquake', totalAyahs: 8, juzStart: 30 },
  { number: 100, name: 'Al-\'Adiyat', arabicName: 'العاديات', englishTranslation: 'The Courser', totalAyahs: 11, juzStart: 30 },
  { number: 101, name: 'Al-Qari\'ah', arabicName: 'القارعة', englishTranslation: 'The Calamity', totalAyahs: 11, juzStart: 30 },
  { number: 102, name: 'At-Takathur', arabicName: 'التكاثر', englishTranslation: 'The Rivalry in World Increase', totalAyahs: 8, juzStart: 30 },
  { number: 103, name: 'Al-\'Asr', arabicName: 'العصر', englishTranslation: 'The Declining Day', totalAyahs: 3, juzStart: 30 },
  { number: 104, name: 'Al-Humazah', arabicName: 'الهمزة', englishTranslation: 'The Traducer', totalAyahs: 9, juzStart: 30 },
  { number: 105, name: 'Al-Fil', arabicName: 'الفيل', englishTranslation: 'The Elephant', totalAyahs: 5, juzStart: 30 },
  { number: 106, name: 'Quraysh', arabicName: 'قريش', englishTranslation: 'Quraysh', totalAyahs: 4, juzStart: 30 },
  { number: 107, name: 'Al-Ma\'un', arabicName: 'الماعون', englishTranslation: 'Small Kindnesses', totalAyahs: 7, juzStart: 30 },
  { number: 108, name: 'Al-Kawthar', arabicName: 'الكوثر', englishTranslation: 'Abundance', totalAyahs: 3, juzStart: 30 },
  { number: 109, name: 'Al-Kafirun', arabicName: 'الكافرون', englishTranslation: 'The Disbelievers', totalAyahs: 6, juzStart: 30 },
  { number: 110, name: 'An-Nasr', arabicName: 'النصر', englishTranslation: 'Divine Support', totalAyahs: 3, juzStart: 30 },
  { number: 111, name: 'Al-Masad', arabicName: 'المسد', englishTranslation: 'The Palm Fibre', totalAyahs: 5, juzStart: 30 },
  { number: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص', englishTranslation: 'Sincerity', totalAyahs: 4, juzStart: 30 },
  { number: 113, name: 'Al-Falaq', arabicName: 'الفلق', englishTranslation: 'The Daybreak', totalAyahs: 5, juzStart: 30 },
  { number: 114, name: 'An-Nas', arabicName: 'الناس', englishTranslation: 'Mankind', totalAyahs: 6, juzStart: 30 }
];
