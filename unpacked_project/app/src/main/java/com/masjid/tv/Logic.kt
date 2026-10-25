package com.masjid.tv

import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.time.chrono.HijrahDate
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoField
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

fun toMin(s: String): Int = s.split(":").let { it[0].toInt() * 60 + it[1].toInt() }

/** "15:47" -> ("03:47", "PM") */
fun fmt12(s: String): Pair<String, String> {
    val m = toMin(s); val h = m / 60; val mm = m % 60
    val h12 = if (h % 12 == 0) 12 else h % 12
    return "%02d:%02d".format(Locale.ENGLISH, h12, mm) to (if (h >= 12) "PM" else "AM")
}

private val HM = listOf("Muharram", "Safar", "Rabi al-Awwal", "Rabi al-Thani", "Jumada al-Awwal",
    "Jumada al-Thani", "Rajab", "Shaban", "Ramadan", "Shawwal", "Dhu al-Qadah", "Dhu al-Hijjah")

fun hijriText(d: LocalDate): String {
    val h = HijrahDate.from(d.plusDays(Config.HIJRI_OFFSET))
    return "${h.get(ChronoField.DAY_OF_MONTH)} ${HM[h.get(ChronoField.MONTH_OF_YEAR) - 1]} ${h.get(ChronoField.YEAR)} AH"
}

fun gregText(d: LocalDate): String =
    d.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy", Locale.ENGLISH))

/** Emoji that follows the weather condition (WMO weather code). */
fun wxEmoji(c: Int): String = when {
    c == 0 -> "☀️"
    c == 1 -> "🌤️"
    c == 2 -> "⛅"
    c == 3 -> "☁️"
    c == 45 || c == 48 -> "🌫️"
    c in 51..57 -> "🌦️"
    c in 61..67 || c in 80..82 -> "🌧️"
    c in 71..77 || c == 85 || c == 86 -> "❄️"
    c >= 95 -> "⛈️"
    else -> "☁️"
}

/** (temperature in °C, emoji) or null when offline. */
suspend fun fetchWeather(): Pair<Int, String>? = withContext(Dispatchers.IO) {
    try {
        val c = URL("https://api.open-meteo.com/v1/forecast?latitude=${Config.LAT}&longitude=${Config.LON}&current=temperature_2m,weather_code")
            .openConnection() as HttpURLConnection
        c.connectTimeout = 8000; c.readTimeout = 8000
        val cur = JSONObject(c.inputStream.bufferedReader().readText()).getJSONObject("current")
        Math.round(cur.getDouble("temperature_2m")).toInt() to wxEmoji(cur.getInt("weather_code"))
    } catch (e: Exception) { null }
}
