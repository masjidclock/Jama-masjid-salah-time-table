package com.masjid.tv

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.SoundPool

/** Clock ticking (res/raw/tick.wav + tock.wav) and the jamaat bell (res/raw/bell.mp3). */
object Sounds {
    private var app: Context? = null
    private var pool: SoundPool? = null
    private var tick = 0
    private var tock = 0

    fun init(ctx: Context) {
        if (pool != null) return
        app = ctx.applicationContext
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        pool = SoundPool.Builder().setMaxStreams(2).setAudioAttributes(attrs).build().also {
            tick = it.load(ctx, R.raw.tick, 1)
            tock = it.load(ctx, R.raw.tock, 1)
        }
    }

    /** alternate = true plays the lower "tock", otherwise the higher "tick". */
    fun tick(alternate: Boolean) {
        pool?.play(if (alternate) tock else tick, 1f, 1f, 1, 0, 1f)
    }

    fun bell() {
        val c = app ?: return
        try {
            MediaPlayer.create(c, R.raw.bell)?.apply {
                setOnCompletionListener { it.release() }
                start()
            }
        } catch (e: Exception) { /* no sound is better than a crash */ }
    }
}
