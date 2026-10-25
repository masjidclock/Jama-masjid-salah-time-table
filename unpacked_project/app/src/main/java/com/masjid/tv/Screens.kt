@file:OptIn(ExperimentalFoundationApi::class)

package com.masjid.tv

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Paint
import android.graphics.Typeface
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.basicMarquee
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.delay

/** Live weather: temperature (°C) + icon that follows the condition; fallback shown when offline. */
object Wx {
    var temp by mutableStateOf(Config.TEMP_FALLBACK)
    var icon by mutableStateOf("☁️")
}

/** OK button / tap toggles a preview of the countdown screen. */
object CdState {
    var mode by mutableIntStateOf(0)          // 0 = live, 1 = countdown preview, 2 = "jamaat in progress" preview
    var start by mutableLongStateOf(0L)
    val force get() = mode == 1
    val actPreview get() = mode == 2
    fun toggle() { mode = (mode + 1) % 3; start = System.currentTimeMillis() }
}

val Gold = Color(0xFFF5C518)
val Muted = Color(0xFFCFD8D3)
val LocalBlur = staticCompositionLocalOf<ImageBitmap?> { null }
val LocalRoot = compositionLocalOf { IntSize.Zero }

// ───────────────────────── helpers ─────────────────────────
@Composable
fun T(
    s: String, size: TextUnit, color: Color = Color.White, w: FontWeight = FontWeight.Normal,
    m: Modifier = Modifier, align: TextAlign = TextAlign.Center, ls: TextUnit = TextUnit.Unspecified
) = Text(s, m, color = color, fontSize = size, fontWeight = w, textAlign = align, letterSpacing = ls)

@Composable
fun TimeText(t: String, color: Color, size: TextUnit = 35.sp) {
    val (a, ap) = fmt12(t)
    Text(buildAnnotatedString {
        withStyle(SpanStyle(fontSize = size, fontWeight = FontWeight.SemiBold, fontFeatureSettings = "tnum")) { append(a) }
        withStyle(SpanStyle(fontSize = (size.value * 0.37f).sp)) { append(" $ap") }
    }, color = color)
}

@Composable
fun appear(delayMs: Int, dur: Int = 1000): Float {
    var go by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) { go = true }
    return animateFloatAsState(if (go) 1f else 0f, tween(dur, delayMs), label = "appear").value
}

/** Frosted glass: draws a pre-blurred copy of the wallpaper behind a translucent tint. */
@Composable
fun Glass(
    modifier: Modifier = Modifier, radius: Dp = 17.dp, tint: Color = Color(0xD6071812),
    border: Color = Color(0x1FFFFFFF), shape: Shape? = null, content: @Composable BoxScope.() -> Unit
) {
    val blur = LocalBlur.current
    val root = LocalRoot.current
    var pos by remember { mutableStateOf(Offset.Zero) }
    val clipShape: Shape = shape ?: RoundedCornerShape(radius)
    Box(
        modifier.clip(clipShape)
            .onGloballyPositioned { pos = it.positionInRoot() }
            .drawBehind {
                if (blur != null && root.width > 0) {
                    drawImage(
                        blur, IntOffset.Zero, IntSize(blur.width, blur.height),
                        IntOffset(-pos.x.roundToInt(), -pos.y.roundToInt()), root,
                        filterQuality = FilterQuality.High
                    )
                }
                drawRect(tint)
            }
            .border(1.dp, border, clipShape),
        content = content
    )
}

// ───────────────────────── root ─────────────────────────
@Composable
fun App() {
    val ctx = LocalContext.current
    val blur = remember {
        val src = BitmapFactory.decodeResource(ctx.resources, R.drawable.bg)
        Bitmap.createScaledBitmap(src, 56, 32, true).asImageBitmap()   // tiny copy upscaled = strong blur
    }
    var splash by remember { mutableStateOf(true) }
    var root by remember { mutableStateOf(IntSize.Zero) }
    val a by animateFloatAsState(if (splash) 0f else 1f, tween(1200, 300), label = "dash")
    LaunchedEffect(Unit) { delay(4800); splash = false }
    LaunchedEffect(Unit) { while (true) { fetchWeather()?.let { Wx.temp = it.first; Wx.icon = it.second }; delay(20 * 60 * 1000L) } }

    CompositionLocalProvider(LocalBlur provides blur, LocalRoot provides root) {
        Box(
            Modifier.fillMaxSize().background(Color.Black).onSizeChanged { root = it }
                .pointerInput(Unit) { detectTapGestures { CdState.toggle() } }
        ) {
            Image(painterResource(R.drawable.bg), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
            Box(Modifier.fillMaxSize().background(Color(0x73040A07)))
            Dashboard(a)
            if (a > 0f) Dust(Modifier.fillMaxSize().graphicsLayer { alpha = a })
            AnimatedVisibility(splash, exit = fadeOut(tween(1000))) { Splash() }
        }
    }
}

// ───────────────────────── splash ─────────────────────────
@Composable
fun Splash() {
    val a1 = appear(200); val a2 = appear(500, 1400); val a3 = appear(1300); val a4 = appear(1600)
    val a5 = appear(1900, 600); val prog = appear(2000, 2400)
    val a6 = appear(2000, 800); val a7 = appear(2500, 800); val a8 = appear(2800, 800)
    fun Modifier.rise(a: Float) = graphicsLayer { alpha = a; translationY = (1f - a) * 11.dp.toPx() }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        Image(painterResource(R.drawable.splash), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Color(0x66030A07)))   // light darkening for readable text
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color(0xD1030A07))))
        T("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 29.sp, Gold, m = Modifier.align(Alignment.TopCenter).padding(top = 28.dp).rise(a1))
        Text(
            buildAnnotatedString {
                append("Made with ")
                withStyle(SpanStyle(color = Color(0xFFFF4D5E))) { append("♥") }
                append(" for Jama Masjid Kodwatand")
            },
            Modifier.align(Alignment.BottomCenter).padding(bottom = 28.dp).rise(a8),
            color = Color(0xFFD9E8DF), fontSize = 13.sp, letterSpacing = 0.5.sp
        )
        Column(Modifier.fillMaxSize(), Arrangement.spacedBy(7.dp, Alignment.CenterVertically), Alignment.CenterHorizontally) {
            Image(
                painterResource(R.drawable.logo), null,
                Modifier.height(260.dp).aspectRatio(0.827f)
                    .graphicsLayer { alpha = a2; scaleX = 0.85f + 0.15f * a2; scaleY = 0.85f + 0.15f * a2 }
            )
            T("Masjid Clock", 31.sp, Color.White, FontWeight.Bold, Modifier.rise(a3))
            Box(
                Modifier.padding(top = 12.dp).width(230.dp).height(3.dp).clip(RoundedCornerShape(2.dp))
                    .graphicsLayer { alpha = a5 }.background(Color(0x2EFFFFFF))
            ) {
                Box(
                    Modifier.fillMaxWidth(prog).fillMaxHeight()
                        .background(Brush.horizontalGradient(listOf(Color(0xFFC9A41C), Color(0xFFFFE27A))))
                )
            }
            T("Preparing prayer times…", 14.sp, Color(0xFFE8F3EC), m = Modifier.rise(a6), ls = 0.5.sp)
            T("Good things take time", 12.sp, Gold, m = Modifier.rise(a7))
        }
    }
}

// ───────────────────────── dashboard ─────────────────────────
@Composable
fun Dashboard(alpha: Float) {
    var now by remember { mutableStateOf(LocalDateTime.now()) }
    LaunchedEffect(Unit) { while (true) { now = LocalDateTime.now(); delay(1000) } }
    // the preview shows demo numbers, so never leave it on by accident
    LaunchedEffect(CdState.mode) { if (CdState.mode != 0) { delay(95_000L); CdState.mode = 0 } }

    val list = Config.prayers
    val nowMin = now.hour * 60 + now.minute + now.second / 60.0
    var ci = list.size - 1
    list.forEachIndexed { i, p -> if (toMin(p.adhan) <= nowMin) ci = i }
    val ni = (ci + 1) % list.size
    val cur = list[ci]; val nxt = list[ni]

    // jamaat countdown: nearest upcoming jamaat (wraps to tomorrow)
    val nowSec = now.hour * 3600 + now.minute * 60 + now.second
    var tgt = list[0]; var secs = Int.MAX_VALUE
    list.forEach { p ->
        var d = toMin(p.jamaat) * 60 - nowSec
        if (d <= 0) d += 86400
        if (d < secs) { secs = d; tgt = p }
    }
    // centre card: nearest jamaat, or the next athan once it is within 20 minutes
    fun until(t: String): Int { var d = toMin(t) * 60 - nowSec; if (d <= 0) d += 86400; return d }
    val jp = list.minByOrNull { until(it.jamaat) }!!
    val ap = list.minByOrNull { until(it.adhan) }!!
    val jd = until(jp.jamaat); val ad = until(ap.adhan)
    val useA = ad <= 20 * 60 && ad < jd
    val evP = if (useA) ap else jp
    val evD = if (useA) ad else jd

    // 4th page: jamaat in progress (from jamaat time, for Config.PRAYER_MINUTES)
    val dur = Config.PRAYER_MINUTES * 60
    var actP: Prayer? = null; var actRem = 0; var actSpan = dur
    list.forEach { p ->
        val el = (nowSec - toMin(p.jamaat) * 60 + 86400) % 86400
        if (el < dur) { actP = p; actRem = dur - el }
    }
    if (actP == null && CdState.actPreview) {
        actSpan = 90      // preview: a 90-second run at normal speed (looping)
        val el = ((System.currentTimeMillis() - CdState.start) / 1000L).toInt()
        actP = tgt; actRem = actSpan - (el % actSpan)
    }
    val showAct = actP != null
    val actHolder = remember { arrayOfNulls<Prayer>(1) }
    actP?.let { actHolder[0] = it }

    val lead = Config.COUNTDOWN_MINUTES * 60
    val showCd = !showAct && (CdState.force || secs <= lead)
    // preview while jamaat is still far away: a 90-second countdown at normal speed (looping)
    val demo = CdState.force && secs > lead
    val span = if (demo) 90 else lead
    val showSecs = if (demo) {
        val el = ((System.currentTimeMillis() - CdState.start) / 1000L).toInt()
        span - (el % span)
    } else secs
    val cdA by animateFloatAsState(if (showCd) 1f else 0f, tween(1000), label = "cd")
    val actA by animateFloatAsState(if (showAct) 1f else 0f, tween(1000), label = "act")

    // sounds: clock ticking in the last 59 seconds, bell when the countdown reaches zero
    val cdSecs by rememberUpdatedState(if (showCd) showSecs else -1)
    val actNow by rememberUpdatedState(showAct)
    LaunchedEffect(Unit) {
        var prev = -1; var prevAct = false; var lastTick = -1
        while (true) {
            val s = cdSecs; val a = actNow
            if (s in 1..59 && s != lastTick) { Sounds.tick(s % 2 == 0); lastTick = s }
            if (s < 1 || s > 59) lastTick = -1
            // bell: the countdown hit zero and the jamaat page took over (or the preview run wrapped around)
            if ((a && !prevAct && prev in 0..3) || (s > 30 && prev in 0..2 && CdState.force)) Sounds.bell()
            if (s >= 0) prev = s else if (!a) prev = -1
            prevAct = a
            delay(200)
        }
    }

    Box(Modifier.fillMaxSize()) {
    Column(
        Modifier.fillMaxSize().graphicsLayer { this.alpha = alpha * (1f - maxOf(cdA, actA)) }.padding(start = 18.dp, end = 18.dp, top = 15.dp, bottom = 47.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Header(now)

        // middle row
        Row(Modifier.fillMaxWidth().weight(1.05f), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            PrayerCard(
                Config.jumah.name, listOf("अज़ान" to Config.jumah.adhan, "जमात" to Config.jumah.jamaat),
                Modifier.weight(1f).fillMaxHeight().padding(vertical = 15.dp)
            )
            Glass(Modifier.weight(2.3f).fillMaxHeight(), radius = 22.dp) {
                Row(Modifier.fillMaxSize().padding(horizontal = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                    AnalogClock(Modifier.size(195.dp))
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
                        T(evP.en.lowercase().replaceFirstChar { it.uppercase() }, 50.sp, Color.White, FontWeight.Bold)
                        val (et, eap) = fmt12(if (useA) evP.adhan else evP.jamaat)
                        Text(
                            buildAnnotatedString {
                                append(if (useA) "ATHAN" else "JAMAAT")
                                withStyle(SpanStyle(color = Color.White)) { append("  $et $eap") }
                            },
                            color = Gold, fontSize = 19.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, maxLines = 1
                        )
                        T("%02d:%02d:%02d".format(Locale.ENGLISH, evD / 3600, evD / 60 % 60, evD % 60), 44.sp, Color.White, FontWeight.ExtraBold)
                    }
                }
            }
            PrayerCard(
                cur.name, listOf("शुरू वक़्त" to cur.adhan, "आख़िरी वक़्त" to nxt.adhan),
                Modifier.weight(1f).fillMaxHeight().padding(vertical = 15.dp), tag = "मौजूदा"
            )
        }

        // bottom row
        Row(Modifier.fillMaxWidth().weight(1f), horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            list.forEachIndexed { i, p ->
                PrayerCard(
                    p.name, listOf("अज़ान" to p.adhan, "जमात" to p.jamaat),
                    Modifier.weight(1f).fillMaxHeight(),
                    tag = when (i) { ni -> "अगली"; ci -> "मौजूदा"; else -> null },
                    next = i == ni, cur = i == ci
                )
            }
        }

    }
    Ticker(Modifier.align(Alignment.BottomCenter).graphicsLayer { this.alpha = alpha * (1f - maxOf(cdA, actA)) })
    if (cdA > 0f) CountdownScreen(now, alpha * cdA, tgt, showSecs, span)
    if (actA > 0f) actHolder[0]?.let { ActiveScreen(now, alpha * actA, it, actRem, actSpan) }
    }
}

@Composable
fun Header(now: LocalDateTime, k: Float = 1f) {
    Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
        Image(painterResource(R.drawable.logo), null, Modifier.height(46.dp).aspectRatio(0.827f))
        Spacer(Modifier.width(11.dp))
        Column(Modifier.weight(1f)) {
            T(Config.MASJID, 20.sp, Color.White, FontWeight.Bold, align = TextAlign.Start)
            Row {
                T(gregText(now.toLocalDate()), 12.5.sp, Muted, align = TextAlign.Start)
                Spacer(Modifier.width(7.dp))
                T(hijriText(now.toLocalDate()), 12.5.sp, Gold, align = TextAlign.Start)
            }
        }
        val (sr, srA) = fmt12(Config.SUNRISE); val (ss, ssA) = fmt12(Config.SUNSET)
        Pill(R.drawable.ic_sunrise, "SUNRISE", sr, srA, Color(0xFFFFC933), k); Spacer(Modifier.width((11f * k).dp))
        Pill(R.drawable.ic_sunset, "SUNSET", ss, ssA, Color(0xFFFF8A4C), k); Spacer(Modifier.width((11f * k).dp))
        WxPill(k)
    }
}

@Composable
fun Ticker(modifier: Modifier = Modifier) {
    Glass(modifier.fillMaxWidth().height(37.dp), radius = 0.dp) {
        Row(Modifier.fillMaxSize().padding(horizontal = 18.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier.clip(RoundedCornerShape(6.dp)).background(Color(0x592EA064))
                    .border(1.dp, Color(0x4DFFFFFF), RoundedCornerShape(6.dp)).padding(horizontal = 11.dp, vertical = 3.dp)
            ) { T("🔔 ANNOUNCEMENTS:", 13.sp, Color.White, FontWeight.SemiBold, ls = 0.5.sp) }
            Spacer(Modifier.width(13.dp))
            Text(
                buildAnnotatedString {
                    Config.announcements.forEach {
                        append("${it.icon} ")
                        withStyle(SpanStyle(color = Gold, fontWeight = FontWeight.SemiBold)) { append(it.title + " ") }
                        append(it.text + "            ")
                    }
                },
                Modifier.weight(1f).basicMarquee(iterations = Int.MAX_VALUE, velocity = 45.dp),
                color = Color.White, fontSize = 15.sp, maxLines = 1, softWrap = false
            )
        }
    }
}

@Composable
fun WxPill(k: Float = 1f) {
    Glass(Modifier.width((132f * k).dp).height((46f * k).dp), radius = 11.dp) {
        Row(
            Modifier.fillMaxSize().padding(horizontal = (10f * k).dp),
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size((27f * k).dp).clip(RoundedCornerShape(7.dp))
                    .background(Brush.radialGradient(listOf(Color(0x545AA0FF), Color(0xEB101C2A))))
                    .border(1.dp, Color(0x4D5AA0FF), RoundedCornerShape(7.dp)),
                contentAlignment = Alignment.Center
            ) { T(Wx.icon, (14f * k).sp) }
            Spacer(Modifier.width((9f * k).dp))
            Text(buildAnnotatedString {
                withStyle(SpanStyle(fontSize = (17f * k).sp, fontWeight = FontWeight.SemiBold)) { append("${Wx.temp}") }
                withStyle(SpanStyle(fontSize = (10f * k).sp, color = Muted)) { append(" °C") }
            }, color = Color.White)
        }
    }
}

@Composable
fun Pill(icon: Int, label: String, value: String, unit: String, tint: Color, k: Float = 1f) {
    Glass(Modifier.width((132f * k).dp).height((46f * k).dp), radius = 11.dp) {
        Row(
            Modifier.fillMaxSize().padding(horizontal = (10f * k).dp),
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                Modifier.size((27f * k).dp).clip(RoundedCornerShape(7.dp))
                    .background(Brush.radialGradient(listOf(tint.copy(alpha = 0.34f), Color(0xEB1C2410))))
                    .border(1.dp, tint.copy(alpha = 0.3f), RoundedCornerShape(7.dp)),
                contentAlignment = Alignment.Center
            ) { Image(painterResource(icon), null, Modifier.size((21f * k).dp)) }
            Spacer(Modifier.width((9f * k).dp))
            Column {
                T(label, (9.5f * k).sp, Muted, align = TextAlign.Start, ls = 1.sp)
                Text(buildAnnotatedString {
                    withStyle(SpanStyle(fontSize = (17f * k).sp, fontWeight = FontWeight.SemiBold)) { append(value) }
                    withStyle(SpanStyle(fontSize = (10f * k).sp, color = Muted)) { append(" $unit") }
                }, color = Color.White)
            }
        }
    }
}

@Composable
fun PrayerCard(
    title: String, rows: List<Pair<String, String>>, modifier: Modifier = Modifier,
    tag: String? = null, next: Boolean = false, cur: Boolean = false
) {
    val fg = if (next) Gold else Color.White
    Box(modifier) {
        Glass(
            Modifier.fillMaxSize(),
            tint = if (next) Color(0xD6222A10) else Color(0xD6071812),
            border = when { next -> Gold; cur -> Gold.copy(alpha = 0.55f); else -> Color(0x1FFFFFFF) }
        ) {
            Column(Modifier.fillMaxSize().padding(horizontal = 12.dp, vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                T(title, 28.sp, fg, FontWeight.Bold, Modifier.fillMaxWidth())
                Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0x2EFFFFFF)))
                rows.forEach { (label, time) ->
                    Column(Modifier.weight(1f), Arrangement.Center, Alignment.CenterHorizontally) {
                        T(label, 15.sp, Color(0xFFE4EBE7), FontWeight.SemiBold)
                        TimeText(time, fg)
                    }
                }
            }
        }
        if (tag != null) {
            Box(
                Modifier.align(Alignment.TopCenter).offset(y = (-12).dp)
                    .clip(RoundedCornerShape(8.dp)).background(Color(0xE607120D))
                    .border(1.dp, Gold, RoundedCornerShape(8.dp)).padding(horizontal = 17.dp, vertical = 3.dp)
            ) { T(tag, 11.sp, Color.White, FontWeight.SemiBold) }
        }
    }
}

// ───────────────────────── countdown screen ─────────────────────────
private val Mint = Color(0xFF2FE6A1)
private val ReddishYellow = Color(0xFFFF8A1E)

@Composable
fun GlowText(s: String, color: Color, size: TextUnit, mod: Modifier = Modifier) = Text(
    s, mod, color = color, fontSize = size, lineHeight = size * 0.98f, fontWeight = FontWeight.Black,
    style = TextStyle(shadow = Shadow(color.copy(alpha = 0.5f), Offset.Zero, 24f))
)

@Composable
fun CountdownScreen(now: LocalDateTime, alpha: Float, target: Prayer, secs: Int, span: Int) {
    val h = secs / 3600; val m = secs / 60 % 60; val s = secs % 60
    val a = if (h > 0) h else m
    val b = if (h > 0) m else s
    val last = secs <= 60
    val fracTarget = 1f - (secs.toFloat() / span).coerceIn(0f, 1f)   // the bar fills up as jamaat gets closer
    val frac by animateFloatAsState(fracTarget, tween(1000, easing = LinearEasing), label = "frac")
    val glow by rememberInfiniteTransition(label = "glow")
        .animateFloat(0.15f, 0.5f, infiniteRepeatable(tween(if (last) 500 else 1500), RepeatMode.Reverse), label = "g")
    val pulse by rememberInfiniteTransition(label = "pulse")
        .animateFloat(1f, 0.6f, infiniteRepeatable(tween(1000), RepeatMode.Reverse), label = "p")

    Box(Modifier.fillMaxSize().graphicsLayer { this.alpha = alpha }) {
    Column(
        Modifier.fillMaxSize().padding(start = 18.dp, end = 18.dp, top = 15.dp, bottom = 14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Header(now, 0.78f)

        Box(Modifier.fillMaxWidth().weight(1f)) {
            Box(Modifier.fillMaxSize()) {
                Column(Modifier.align(Alignment.CenterStart).padding(start = 28.dp).offset(y = (-12).dp)) {
                    GlowText(target.en, Color(0xFFFFF0A0), 30.sp)
                    GlowText("JAMAAT", Gold, 30.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        GlowText("IN", Mint, 30.sp)
                        Spacer(Modifier.width(8.dp))
                        Box(Modifier.size(7.dp).clip(CircleShape).background(Mint))
                        Box(Modifier.width(100.dp).height(1.5.dp).background(Color(0xFF8A7414)))
                    }
                }
                // The ring is lifted slightly upward (-12dp) and scaled 3% bigger (sc = 1.0815f) with comfortable margins
                BoxWithConstraints(
                    Modifier.align(Alignment.Center).fillMaxHeight().aspectRatio(1f).offset(y = (-12).dp),
                    contentAlignment = Alignment.Center
                ) {
                    val sc = (maxWidth.value / 400f) * 1.0815f
                    Box(
                        Modifier.fillMaxSize(0.925f).clip(CircleShape)
                            .background(Brush.radialGradient(listOf(Color(0xFF34373B), Color(0xFF141517))))
                            .border(1.dp, Color(0x1FFFFFFF), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            // Numbers: Clean solid countdown timer without glow (glow only on circular progress bar)
                            val clockColor = Color.White
                            val colonColor = Gold
                            val clockStyle = TextStyle(
                                shadow = Shadow(color = Color.Black.copy(alpha = 0.5f), offset = Offset.Zero, blurRadius = 8f),
                                fontFeatureSettings = "tnum"
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("%02d".format(Locale.ENGLISH, a), color = clockColor, fontSize = (118f * sc).sp, fontWeight = FontWeight.ExtraBold, style = clockStyle)
                                Text(":", color = colonColor, fontSize = (100f * sc).sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(horizontal = 4.dp), style = clockStyle)
                                Text("%02d".format(Locale.ENGLISH, b), color = clockColor, fontSize = (118f * sc).sp, fontWeight = FontWeight.ExtraBold, style = clockStyle)
                            }
                            Row(Modifier.width((268f * sc).dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                listOf(if (h > 0) "HR" else "MIN", if (h > 0) "MIN" else "SEC").forEach { lb ->
                                    Box(
                                        Modifier.clip(RoundedCornerShape(9.dp)).background(Color(0x80146442))
                                            .border(1.dp, Color(0xFF1F9A68), RoundedCornerShape(9.dp))
                                            .padding(horizontal = (19f * sc).dp, vertical = 2.dp)
                                    ) { T(lb, (19f * sc).sp, Mint, FontWeight.ExtraBold, ls = 2.sp) }
                                }
                            }
                        }
                    }
                    Canvas(Modifier.fillMaxSize()) {
                        val sw = (11f * sc).dp.toPx()
                        val d = minOf(size.width, size.height)
                        val tl = Offset((size.width - d) / 2 + sw / 2, (size.height - d) / 2 + sw / 2)
                        val sz = Size(d - sw, d - sw)
                        // Dark background track
                        drawArc(
                            Color(0xFF15191E),
                            0f, 360f, false, tl, sz,
                            style = Stroke(sw)
                        )
                        // progress bar starts luminating with a gentle glow-and-fade during the last minutes
                        if (last && frac > 0.005f) {
                            for (i in 1..3) {
                                drawArc(
                                    ReddishYellow.copy(alpha = (glow * 0.16f / i).coerceAtMost(0.65f)), -90f, 360f * frac, false, tl, sz,
                                    style = Stroke(sw * (1f + i * 0.28f), cap = StrokeCap.Round)
                                )
                            }
                        } else if (frac > 0.005f) {
                            drawArc(
                                Gold.copy(alpha = 0.25f), -90f, 360f * frac, false, tl, sz,
                                style = Stroke(sw * 1.2f, cap = StrokeCap.Round)
                            )
                        }
                        if (frac > 0.005f) {
                            rotate(-90f) {
                                drawArc(
                                    Brush.sweepGradient(if (last) listOf(ReddishYellow, Color(0xFFFFF0A0), Color(0xFFFF5A00), ReddishYellow) else listOf(Gold, Color(0xFFFFE98A), Color(0xFFF5A800), Gold)),
                                    0f, 360f * frac, false, tl, sz, style = Stroke(sw, cap = StrokeCap.Round)
                                )
                            }
                        }
                        val ang = Math.toRadians(-90.0 + 360.0 * frac)
                        val rr = (d - sw) / 2
                        val head = center + Offset((cos(ang) * rr).toFloat(), (sin(ang) * rr).toFloat())
                        if (last) {
                            drawCircle(Brush.radialGradient(listOf(ReddishYellow.copy(alpha = glow * 0.6f), Color.Transparent), head, sw * 2f), sw * 2f, head)
                        }
                        drawCircle(Brush.radialGradient(listOf(Color(0x99FFE98A), Color.Transparent), head, sw * 1.5f), sw * 1.5f, head)
                        drawCircle(Color(0xFFFFF6C8), sw * 0.65f, head)
                    }
                }
            }
        }

    }
        Text(
            now.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH)),
            Modifier.align(Alignment.BottomStart).padding(start = 24.dp, bottom = 12.dp),
            color = Color.White, fontSize = 38.sp, fontWeight = FontWeight.ExtraBold,
            style = TextStyle(shadow = Shadow(Color(0xBF000000), Offset(0f, 3f), 14f))
        )
        Dust(Modifier.fillMaxSize())
    }
}

// ───────────────────────── 4th page: jamaat in progress ─────────────────────────
@Composable
fun ActiveNote(emoji: String, title: String, bg: Color, line: Color, modifier: Modifier) {
    val shape = RoundedCornerShape(15.dp)
    Row(
        modifier.clip(shape).background(bg).border(1.dp, line, shape).padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        T(emoji, 40.sp)
        Spacer(Modifier.width(13.dp))
        T(title, 24.sp, Color.White, FontWeight.ExtraBold, align = TextAlign.Start)
    }
}

@Composable
fun ActiveScreen(now: LocalDateTime, alpha: Float, p: Prayer, rem: Int, span: Int) {
    val live by rememberInfiniteTransition(label = "live")
        .animateFloat(1f, 0.35f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "l")
    Box(Modifier.fillMaxSize().graphicsLayer { this.alpha = alpha }) {
        Column(
            Modifier.fillMaxSize().padding(start = 18.dp, end = 18.dp, top = 15.dp, bottom = 40.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(Modifier.fillMaxWidth().height(48.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.logo), null, Modifier.height(46.dp).aspectRatio(0.827f))
                Spacer(Modifier.width(11.dp))
                Column {
                    T(Config.MASJID, 20.sp, Color.White, FontWeight.Bold, align = TextAlign.Start)
                    Row {
                        T(gregText(now.toLocalDate()), 12.5.sp, Muted, align = TextAlign.Start)
                        Spacer(Modifier.width(7.dp))
                        T(hijriText(now.toLocalDate()), 12.5.sp, Gold, align = TextAlign.Start)
                    }
                }
            }
            Glass(Modifier.fillMaxWidth().weight(1f), radius = 20.dp, border = Gold.copy(alpha = 0.5f)) {
                Column(
                    Modifier.fillMaxSize().padding(horizontal = 20.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.SpaceEvenly, horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(14.dp).clip(CircleShape).background(Mint.copy(alpha = live)))
                        Spacer(Modifier.width(9.dp))
                        T("जमात जारी है  •  JAMAAT IN PROGRESS", 18.sp, Mint, FontWeight.ExtraBold, ls = 1.5.sp)
                    }
                    GlowText("${p.name} (${p.en})", Gold, 50.sp)
                    Row(Modifier.fillMaxWidth().height(86.dp), horizontalArrangement = Arrangement.spacedBy(17.dp)) {
                        ActiveNote("📵", "मोबाइल फ़ोन बंद रखें", Color(0x99501414), Color(0x66FF5A5A), Modifier.weight(1f).fillMaxHeight())
                        ActiveNote("👥", "सफ़ सीधी और मुकम्मल करें", Color(0x8C0F4630), Color(0x802EA064), Modifier.weight(1f).fillMaxHeight())
                    }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.width(345.dp).height(4.5.dp).clip(RoundedCornerShape(3.dp)).background(Color(0x24FFFFFF))) {
                            Box(
                                Modifier.fillMaxWidth((rem.toFloat() / span).coerceIn(0f, 1f)).fillMaxHeight()
                                    .background(Brush.horizontalGradient(listOf(Mint, Gold)))
                            )
                        }
                        Spacer(Modifier.height(7.dp))
                        T("Returning to dashboard in %02d:%02d".format(Locale.ENGLISH, rem / 60, rem % 60), 13.sp, Color(0xFFD3DCD7))
                    }
                }
            }
        }
        Glass(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(30.dp), radius = 0.dp) {
            Row(Modifier.fillMaxSize().padding(horizontal = 24.dp), verticalAlignment = Alignment.CenterVertically) {
                T("🕒 " + now.format(DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH)), 15.sp, Color.White, FontWeight.Bold, align = TextAlign.Start)
            }
        }
        Dust(Modifier.fillMaxSize())
    }
}

// ───────────────────────── analog clock ─────────────────────────
@Composable
fun AnalogClock(modifier: Modifier) {
    var frame by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) { while (true) withFrameNanos { frame = it } }
    val paint = remember {
        Paint().apply {
            isAntiAlias = true; color = 0xFFE0B81A.toInt(); textAlign = Paint.Align.CENTER
            typeface = Typeface.create(Typeface.SERIF, Typeface.BOLD)
        }
    }
    val gold = Color(0xFFE0B81A)
    Canvas(modifier) {
        frame // read to redraw every frame
        val t = LocalDateTime.now()
        val k = size.minDimension / 400f      // the face is drawn on a 400 x 400 grid, exactly like the web design
        val c = center
        fun pt(x: Float, y: Float) = Offset(c.x + (x - 200f) * k, c.y + (y - 200f) * k)

        // face
        drawCircle(Color(0xFF08201A), 196f * k, c)
        drawCircle(Color(0xFF123626), 196f * k, c, style = Stroke(2f * k))
        drawCircle(Brush.radialGradient(listOf(Color(0xFF03120C), Color(0xFF010806)), c, 178f * k), 178f * k, c)
        drawCircle(Color(0xFFC9A41C), 178f * k, c, style = Stroke(2f * k))
        drawCircle(
            Color(0xFF8A7516), 170f * k, c,
            style = Stroke(1f * k, cap = StrokeCap.Round, pathEffect = PathEffect.dashPathEffect(floatArrayOf(1f * k, 8f * k)))
        )
        // eight ticks (the 12 / 3 / 6 / 9 positions carry numbers)
        for (i in 0 until 12) if (i % 3 != 0) {
            val a = Math.toRadians(i * 30.0)
            val sn = sin(a).toFloat(); val cs = cos(a).toFloat()
            drawLine(gold, pt(200f + sn * 150f, 200f - cs * 150f), pt(200f + sn * 130f, 200f - cs * 130f), 4f * k, StrokeCap.Round)
        }
        // numbers
        paint.textSize = 42f * k
        listOf(Triple("12", 200f, 95f), Triple("3", 320f, 215f), Triple("6", 200f, 335f), Triple("9", 82f, 215f)).forEach { (n, x, y) ->
            val p = pt(x, y)
            drawContext.canvas.nativeCanvas.drawText(n, p.x, p.y, paint)
        }
        // hands (tapered, same shapes as the web clock)
        val sec = t.second + t.nano / 1e9
        val minute = t.minute + sec / 60.0
        val hour = t.hour % 12 + t.minute / 60.0
        rotate((hour * 30.0).toFloat(), c) {
            val p = Path().apply { moveTo(pt(196f, 200f).x, pt(196f, 200f).y); lineTo(pt(204f, 200f).x, pt(204f, 200f).y); lineTo(pt(200f, 118f).x, pt(200f, 118f).y); close() }
            drawPath(p, Color(0xFFF0C419))
        }
        rotate((minute * 6.0).toFloat(), c) {
            val p = Path().apply { moveTo(pt(195f, 200f).x, pt(195f, 200f).y); lineTo(pt(205f, 200f).x, pt(205f, 200f).y); lineTo(pt(200f, 60f).x, pt(200f, 60f).y); close() }
            drawPath(p, Color(0xFFF0C419))
        }
        rotate((sec * 6.0).toFloat(), c) {
            drawLine(Color(0xFFE53B3B), pt(200f, 230f), pt(200f, 48f), 2.5f * k)
        }
        drawCircle(Color(0xFFE0A800), 14f * k, c)
        drawCircle(Color(0xFFDD2222), 6f * k, c)
    }
}

// ───────────────────────── floating golden dust ─────────────────────────
private const val DW = 960f
private const val DH = 540f

private class Mote(val big: Boolean) {
    private fun rnd(a: Float, b: Float) = a + Random.nextFloat() * (b - a)
    var x = rnd(0f, DW); var y = rnd(0f, DH)
    val r = if (big) rnd(6f, 24f) else rnd(1f, 2.4f)
    val vy = -(if (big) rnd(3.5f, 9f) else rnd(4f, 11f))
    val vx = rnd(-3f, 3f)
    val a = if (big) rnd(0.3f, 0.7f) else rnd(0.5f, 1f)
    val ph = rnd(0f, 6.28f); val fr = rnd(0.25f, 0.7f); val sw = rnd(0.3f, 0.8f)
}

@Composable
fun Dust(modifier: Modifier) {
    val big = remember { List(38) { Mote(true) } }
    val small = remember { List(160) { Mote(false) } }
    val all = remember { big + small }
    var tick by remember { mutableLongStateOf(0L) }
    LaunchedEffect(Unit) {
        var last = 0L
        while (true) withFrameNanos { t ->
            val dt = if (last == 0L) 0f else ((t - last) / 1e9f).coerceAtMost(0.1f)
            last = t
            val ts = t / 1e9f
            for (p in all) {
                val amp = if (p.big) 5f else 3f
                val div = if (p.big) 2f else 1.5f
                val mg = if (p.big) 30f else 5f
                p.y += p.vy * dt
                p.x += (p.vx + sin(ts / div * p.sw + p.ph) * amp) * dt
                if (p.y < -mg) { p.y = DH + mg; p.x = Random.nextFloat() * DW }
                if (p.x < -mg) p.x = DW + mg
                if (p.x > DW + mg) p.x = -mg
            }
            tick = t
        }
    }
    Canvas(modifier) {
        val t = tick / 1e9f
        val k = size.width / DW
        for (p in big) {
            val al = p.a * (0.65f + 0.35f * sin(t * p.fr + p.ph))
            val ctr = Offset(p.x * k, p.y * k); val rad = p.r * k
            drawCircle(
                Brush.radialGradient(
                    listOf(Color(1f, 0.886f, 0.549f, al), Color(1f, 0.78f, 0.31f, al * 0.55f), Color.Transparent),
                    ctr, rad
                ), rad, ctr, blendMode = BlendMode.Plus
            )
        }
        for (p in small) {
            val al = p.a * (0.4f + 0.6f * abs(sin(t * p.fr + p.ph)))
            drawCircle(Color(1f, 0.91f, 0.667f, al), p.r * k, Offset(p.x * k, p.y * k), blendMode = BlendMode.Plus)
        }
    }
}
