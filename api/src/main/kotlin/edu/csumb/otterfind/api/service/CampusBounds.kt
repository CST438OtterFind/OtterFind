package edu.csumb.otterfind.api.service

private data class Zone(val west: Double, val south: Double, val east: Double, val north: Double)

/** Everywhere a pin may go. Keep this in step with CAMPUS_ZONES in app/src/features/map/campus.ts. */
private val CAMPUS_ZONES = listOf(
    Zone(west = -121.80947, south = 36.64632, east = -121.78564, north = 36.66136),
)

/** Whether a point is inside a campus zone. The app checks too, but only for quick feedback. */
fun isOnCampus(latitude: Double, longitude: Double): Boolean =
    CAMPUS_ZONES.any { latitude in it.south..it.north && longitude in it.west..it.east }
