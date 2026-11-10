package edu.csumb.otterfind.api.service

import org.junit.jupiter.api.Test
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class CampusBoundsTest {
    @Test
    fun `the Library is on campus`() {
        assertTrue(isOnCampus(36.65231, -121.79614))
    }

    @Test
    fun `the campus limit itself counts as on campus`() {
        assertTrue(isOnCampus(36.64632, -121.80947))
        assertTrue(isOnCampus(36.66136, -121.78564))
    }

    @Test
    fun `each side of the campus has a limit`() {
        assertFalse(isOnCampus(36.64631, -121.79), "south")
        assertFalse(isOnCampus(36.66137, -121.79), "north")
        assertFalse(isOnCampus(36.65, -121.80948), "west")
        assertFalse(isOnCampus(36.65, -121.78563), "east")
    }
}
