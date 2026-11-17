package edu.csumb.otterfind.api.service

import org.junit.jupiter.api.Test
import java.time.Duration
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ListingValidatorTest {
    private val now = Instant.parse("2026-11-09T20:00:00Z")

    private val valid = ListingRequest(
        title = "Grey tabby cat",
        listingType = "LOST",
        category = "PET",
        buildingId = 25,
        floor = 2,
        latitude = 36.65231,
        longitude = -121.79614,
    )

    private fun validate(request: ListingRequest, buildingExists: Boolean = true) = validateListing(request, { buildingExists }, now)

    private fun problemsWith(request: ListingRequest, buildingExists: Boolean = true): List<FieldProblem> =
        assertFailsWith<FieldValidationException> { validate(request, buildingExists) }.problems

    private fun fieldsWrongIn(request: ListingRequest, buildingExists: Boolean = true) = problemsWith(request, buildingExists).map { it.field }

    @Test
    fun `a complete request passes`() {
        val listing = validate(valid)
        assertEquals("Grey tabby cat", listing.title)
        assertEquals(25, listing.buildingId)
    }

    @Test
    fun `spaces around the title don't count`() {
        assertEquals(listOf("title"), fieldsWrongIn(valid.copy(title = "  Cat  ")))
        assertEquals("Keys", validate(valid.copy(title = "  Keys  ")).title)
    }

    @Test
    fun `an empty form reports every required field at once`() {
        assertEquals(setOf("title", "listingType", "category", "buildingId"), fieldsWrongIn(ListingRequest()).toSet())
    }

    @Test
    fun `a title can't be too long`() {
        assertEquals(listOf("title"), fieldsWrongIn(valid.copy(title = "x".repeat(121))))
    }

    @Test
    fun `unknown types and categories are refused`() {
        assertEquals(listOf("listingType"), fieldsWrongIn(valid.copy(listingType = "STOLEN")))
        assertEquals(listOf("category"), fieldsWrongIn(valid.copy(category = "lost")))
    }

    @Test
    fun `a building that doesn't exist is refused`() {
        assertEquals(listOf("buildingId"), fieldsWrongIn(valid, buildingExists = false))
    }

    @Test
    fun `the floor must be plausible but is optional`() {
        assertEquals(listOf("floor"), fieldsWrongIn(valid.copy(floor = 21)))
        assertEquals(listOf("floor"), fieldsWrongIn(valid.copy(floor = -3)))
        assertEquals(null, validate(valid.copy(floor = null)).floor)
    }

    @Test
    fun `a blank description is stored as none`() {
        assertEquals(null, validate(valid.copy(description = "   ")).description)
        assertEquals(listOf("description"), fieldsWrongIn(valid.copy(description = "x".repeat(2001))))
    }

    @Test
    fun `a pin needs both coordinates or neither`() {
        assertEquals(listOf("latitude"), fieldsWrongIn(valid.copy(longitude = null)))
        assertEquals(listOf("latitude"), fieldsWrongIn(valid.copy(latitude = null)))
        assertEquals(null, validate(valid.copy(latitude = null, longitude = null)).latitude)
    }

    @Test
    fun `a pin on the campus edge passes and one just past it doesn't`() {
        assertEquals(36.66136, validate(valid.copy(latitude = 36.66136)).latitude)
        assertEquals("Pins must be on the CSUMB campus", problemsWith(valid.copy(latitude = 36.66137)).single().message)
    }

    @Test
    fun `last seen defaults to now`() {
        assertEquals(now, validate(valid).lastSeenAt)
    }

    @Test
    fun `last seen can be in the past, or slightly ahead for a fast phone clock, but not the future`() {
        val hourAgo = now.minus(Duration.ofHours(1))
        assertEquals(hourAgo, validate(valid.copy(lastSeenAt = hourAgo)).lastSeenAt)
        validate(valid.copy(lastSeenAt = now.plus(Duration.ofMinutes(4))))
        assertEquals(listOf("lastSeenAt"), fieldsWrongIn(valid.copy(lastSeenAt = now.plus(Duration.ofMinutes(6)))))
    }
}
