# Halqa Tracker (حلقہ ٹریکر)

A mobile-first, 100% offline Quran class progress, recitation scoring, and discipline tracker designed specifically for Halqa teachers, Madaris, and Quran circles.

---

## 🌟 Key Features

1. **Recitation Evaluation & Scoring Engine**:
   - **Sabaq (سبق - New Lesson)**: 10 base pts, mistake deductions (-1 pt/mistake) with separate tracking for **Lqma** (prompts) and **Tajweed / Makhraj** slips.
   - **Sabqi (سبقی - Recent Revision)**: 20 base pts, -3 pts/mistake.
   - **Manzil (منزل - Old Retention)**: 15 base pts, -1 pt/mistake.
   - **Adab & Discipline (ادب و حاضری)**: Uniform (+2), Behaviour/Adab (+2), Punctuality (+1), plus ad-hoc bonus/deduction notes.
   - **Bonuses**: Clean Recitation Bonus (+1 per flawless portion, max +3) & Comeback Bonus (+3 for redemption after low days).
   - **Daily Floor**: Capped at minimum -25 pts to protect cumulative balance.

2. **Quran Reference Browser (Juz & Surah Portion Picker)**:
   - Full reference of all 30 Paras (Juz) with Arabic names (الم، سيقول، تلك الرسل...).
   - Selection of 114 Surahs with Arabic calligraphy names, verse count, and quick ayah presets (1-10, 1-20, Full Surah).

3. **Recitation Timer & Audio Feedback**:
   - Built-in session stopwatch timer for measuring student recitation speed.
   - Synthetic Web Audio tactile feedback for mistake increments, bonuses, and saves (with quick mute toggle).

4. **Circle Discipline, Warnings & Fines Ledger**:
   - **3-Warning Rule**: Warnings 1 & 2 alert the student; the 3rd cumulative warning automatically terminates the student, applies a -500 pts team fine, and freezes the circle's ranking for the week.
   - **Fines Management (جرمانہ رجسٹر)**: Issue fines in Rs. with presets (Late arrival, incomplete lesson, unexcused absence, classroom disturbance) or custom amounts.
   - Mark as paid, waive, delete, and 1-tap WhatsApp list dispatch of pending arrears.

5. **Reports & WhatsApp Parent Dispatch**:
   - **1-Tap WhatsApp Message**: Generates Arabic/Urdu or English formatted progress reports ready to dispatch to parents via WhatsApp or Web Share.
   - **Weekly Podium Leaderboard**: Interactive podium ceremony for 1st, 2nd, and 3rd place circles (Badr, Uhud, Yarmouk), Best Reciter, and Most Improved Student.
   - **Data Backup & Restore**: Offline JSON export/import and Excel CSV export.

6. **Offline Security & Licensing**:
   - Cryptographic self-verifying license keys with anti-clock rollback defense.
   - 4-digit Teacher Security PIN lock with customizable idle timeout.
   - Owner Admin Dashboard to generate new keys, issue renewal codes (+30d), and block/unblock devices.
   - Integrated QA Self-Test Suite verifying all mathematical scenarios with a 100% test pass indicator.

---

## 🔑 Demo Access (Instant 1-Tap Login)

- **Teacher Portal**:
  - Username: `BILAL`
  - Key: `HQ-TIME-BILAL-365-1700000000-T001-7814AB2C4E93`
- **Owner Admin Panel**:
  - Username: `ADMIN`
  - Key: `HQ-MSTR-ADMIN-0-1700000000-M001-EF3DE87C7B53`
  - Admin PIN: `1984`

---

## 🚀 Building & Exporting

### Static Web Release
```bash
npm run build
```
The output `dist/` and `android_assets/` directories contain self-contained static HTML, CSS, and JS ready for offline hosting or embedding into Android WebView.

### Android APK via Capacitor
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Halqa Tracker" "com.halqatracker.quran" --web-dir dist
npx cap add android
npx cap sync android
npx cap open android
```
In Android Studio: Select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
