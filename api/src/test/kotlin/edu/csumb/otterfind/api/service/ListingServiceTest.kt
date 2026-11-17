package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.BuildingRepository
import edu.csumb.otterfind.api.repository.ItemListing
import edu.csumb.otterfind.api.repository.ItemListingRepository
import edu.csumb.otterfind.api.repository.ListingCategory
import edu.csumb.otterfind.api.repository.ListingRow
import edu.csumb.otterfind.api.repository.ListingStatus
import edu.csumb.otterfind.api.repository.ListingType
import edu.csumb.otterfind.api.repository.UserRepository
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.lang.reflect.Proxy
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class ListingServiceTest {
    private val now = Instant.parse("2026-11-09T20:00:00Z")
    private val saved = mutableListOf<ItemListing>()
    private val deleted = mutableListOf<Long>()

    private inline fun <reified T> fake(crossinline answer: (String, Array<out Any>) -> Any?): T = Proxy.newProxyInstance(
        T::class.java.classLoader,
        arrayOf(T::class.java),
    ) { _, method, args -> answer(method.name, args ?: emptyArray()) } as T

    private fun row(id: Long, ownerId: Long) = ListingRow(
        id = id,
        ownerId = ownerId,
        buildingId = 25,
        buildingName = "Library",
        listingType = ListingType.LOST,
        category = ListingCategory.PET,
        itemName = "Grey tabby cat",
        description = null,
        floor = 2,
        latitude = 36.65231,
        longitude = -121.79614,
        status = ListingStatus.ACTIVE,
        lastSeenAt = now,
        createdAt = now,
    )

    private fun listing(id: Long, ownerId: Long) = ItemListing(
        id = id,
        ownerId = ownerId,
        buildingId = 25,
        listingType = ListingType.LOST,
        category = ListingCategory.PET,
        itemName = "Grey tabby cat",
        description = null,
        floor = null,
        latitude = null,
        longitude = null,
        lastSeenAt = now,
        createdAt = now,
    )

    private val listings: ItemListingRepository = fake { name, args ->
        when (name) {
            "findActiveRows" -> listOf(row(1, ownerId = 7), row(2, ownerId = 8))
            "findRowById" -> (args[0] as Long).takeIf { it != MISSING }?.let { row(it, ownerId = 7) }
            "findById" -> Optional.ofNullable((args[0] as Long).takeIf { it != MISSING }?.let { listing(it, ownerId = 7) })
            "save" -> (args[0] as ItemListing).also { saved += it }.copy(id = 42)
            "deleteById" -> deleted.add(args[0] as Long)
            else -> error("Unexpected repository call: $name")
        }
    }

    private val buildings: BuildingRepository = fake { name, args ->
        check(name == "existsById") { "Unexpected repository call: $name" }
        args[0] == 25L
    }

    private val users: UserRepository = fake { name, args ->
        check(name == "existsById") { "Unexpected repository call: $name" }
        args[0] != DELETED_USER
    }

    private val service = ListingService(listings, buildings, users, Clock.fixed(now, ZoneOffset.UTC))

    private val request = ListingRequest(title = "Grey tabby cat", listingType = "LOST", category = "PET", buildingId = 25)

    private fun statusOf(block: () -> Unit): HttpStatus = HttpStatus.valueOf(assertFailsWith<ResponseStatusException> { block() }.statusCode.value())

    @Test
    fun `the list marks only the viewer's own listings`() {
        assertEquals(listOf(true, false), service.list(viewerId = 7).map { it.mine })
    }

    @Test
    fun `a listing shows its building's name`() {
        assertEquals(BuildingSummary(25, "Library"), service.get(1, viewerId = 7).building)
    }

    @Test
    fun `opening a missing listing is a 404`() {
        assertEquals(HttpStatus.NOT_FOUND, statusOf { service.get(MISSING, viewerId = 7) })
    }

    @Test
    fun `a new listing belongs to the signed-in user and is stamped with the current time`() {
        val response = service.create(request, ownerId = 7)

        assertEquals(42, response.id)
        assertEquals(7, saved.single().ownerId)
        assertEquals(now, saved.single().createdAt)
        assertEquals(now, saved.single().lastSeenAt)
    }

    @Test
    fun `invalid input saves nothing`() {
        assertFailsWith<FieldValidationException> { service.create(request.copy(title = "Cat"), ownerId = 7) }
        assertTrue(saved.isEmpty())
    }

    @Test
    fun `a deleted account can't post`() {
        assertEquals(HttpStatus.UNAUTHORIZED, statusOf { service.create(request, ownerId = DELETED_USER) })
        assertTrue(saved.isEmpty())
    }

    @Test
    fun `the owner can delete a listing`() {
        service.delete(1, requesterId = 7)
        assertEquals(listOf(1L), deleted)
    }

    @Test
    fun `someone else can't delete a listing`() {
        assertEquals(HttpStatus.FORBIDDEN, statusOf { service.delete(1, requesterId = 8) })
        assertTrue(deleted.isEmpty())
    }

    @Test
    fun `deleting a missing listing is a 404`() {
        assertEquals(HttpStatus.NOT_FOUND, statusOf { service.delete(MISSING, requesterId = 7) })
    }

    private companion object {
        const val MISSING = 404L
        const val DELETED_USER = 99L
    }
}
