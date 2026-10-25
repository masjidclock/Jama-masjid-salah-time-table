package com.masjid.tv

data class Prayer(val name: String, val en: String, val adhan: String, val jamaat: String)
data class Notice(val icon: String, val title: String, val text: String)

/** EDIT THIS FILE to change times, name and announcements (24h "HH:mm"). */
object Config {
    const val MASJID = "Rahmat Nagar Kodwatand, Lalpania"
    const val SUNRISE = "05:42"
    const val SUNSET = "17:29"
    const val MASJID_SHORT = "Jama Masjid Kodwatand"
    const val PRAYER_MINUTES = 10        // the "Jamaat in progress" page stays this many minutes after jamaat starts
    const val COUNTDOWN_MINUTES = 15     // full-screen countdown shows this many minutes before jamaat
    const val HIJRI_OFFSET = 0L          // -1 / +1 to match local moon sighting
    const val LAT = 23.65                // used for live temperature (Open-Meteo)
    const val LON = 86.15
    const val TEMP_FALLBACK = 21

    val prayers = listOf(
        Prayer("फ़ज्र", "FAJR", "04:26", "04:56"),
        Prayer("ज़ोहर", "ZUHAR", "11:37", "11:52"),
        Prayer("अस्र", "ASAR", "15:47", "16:02"),
        Prayer("मग़रिब", "MAGHRIB", "17:29", "17:34"),
        Prayer("इशा", "ISHA", "18:41", "18:56")
    )
    val jumah = Prayer("जुमा", "JUMUAH", "12:45", "13:15")

    val announcements = listOf(
        Notice("🕌", "जुमा के औक़ात:", "1st Khutbah 12:45 PM | 2nd Khutbah 01:45 PM. Please arrive early and park responsibly."),
        Notice("🌙", "Quran Memorization Classes:", "Every evening after Maghrib. All children are welcome.")
    )
}
