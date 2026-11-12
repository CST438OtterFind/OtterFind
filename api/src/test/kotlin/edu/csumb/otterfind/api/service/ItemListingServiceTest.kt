
package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.Building
import edu.csumb.otterfind.api.repository.BuildingRepository
import edu.csumb.otterfind.api.repository.ItemListing
import edu.csumb.otterfind.api.repository.ItemListingRepository
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.lang.reflect.Proxy
import java.util.Optional
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ItemListingServiceTest {

    private val building = Building(
        id = 1,
        name = "Library",
        latitude = 36.65,
        longitude = -121.79
    )

    private fun item(
        id: Long = 1,
        buildingId: Long? = null,
        listingType: String = "LOST"
    ) = ItemListing(
        id = id,
        ownerId = 10,
        buildingId = buildingId,
        itemName = "Black Wallet",
        category = "WALLET",
        color = "Black",
        listingType = listingType
    )

    private fun itemRepository(
        items: List<ItemListing> = emptyList()
    ): ItemListingRepository = Proxy.newProxyInstance(
        ItemListingRepository::class.java.classLoader,
        arrayOf(ItemListingRepository::class.java)
    ) { _, method, args ->
        when (method.name) {
            "findAll" -> items

            "findById" -> Optional.ofNullable(
                items.find { it.id == args?.get(0) }
            )

            "save" -> {
                val listing = args!![0] as ItemListing
                listing.copy(id = 100)
            }

            else -> error("Unexpected repository call: ${method.name}")
        }
    } as ItemListingRepository

    private fun buildingRepository(): BuildingRepository =
        Proxy.newProxyInstance(
            BuildingRepository::class.java.classLoader,
            arrayOf(BuildingRepository::class.java)
        ) { _, method, args ->
            when (method.name) {
                "findById" -> Optional.ofNullable(
                    if (args?.get(0) == building.id) building else null
                )

                else -> error("Unexpected repository call: ${method.name}")
            }
        } as BuildingRepository

    private fun service(
        items: List<ItemListing> = emptyList()
    ) = ItemListingService(
        itemRepository(items),
        buildingRepository()
    )

    private fun validRequest(
        itemName: String = "Black Wallet",
        category: String = "WALLET",
        color: String = "Black",
        isOwner: Boolean = true,
        buildingId: Long? = null,
        description: String = ""
    ) = CreateItemRequest(
        itemName = itemName,
        category = category,
        color = color,
        isOwner = isOwner,
        buildingId = buildingId,
        description = description
    )

    @Test
    fun `listItems returns an empty list when no items exist`() {
        assertTrue(service().listItems().isEmpty())
    }

    @Test
    fun `listItems returns existing items`() {
        val result = service(listOf(item())).listItems()

        assertEquals(1, result.size)
        assertEquals("Black Wallet", result[0].itemName)
        assertEquals("LOST", result[0].listingType)
    }

    @Test
    fun `getItem returns an existing item`() {
        val result = service(listOf(item(id = 5))).getItem(5)

        assertEquals(5, result.id)
        assertEquals("Black Wallet", result.itemName)
        assertTrue(result.isOwner)
    }

    @Test
    fun `getItem rejects an unknown item`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().getItem(999)
        }

        assertEquals(HttpStatus.NOT_FOUND, exception.statusCode)
    }

    @Test
    fun `createItem creates a lost listing for an owner`() {
        val result = service().createItem(
            validRequest(),
            reporterId = 10
        )

        assertEquals(100, result.id)
        assertEquals("LOST", result.listingType)
        assertTrue(result.isOwner)
        assertEquals("ACTIVE", result.status)
    }

    @Test
    fun `createItem creates a found listing for a finder`() {
        val result = service().createItem(
            validRequest(isOwner = false),
            reporterId = 10
        )

        assertEquals("FOUND", result.listingType)
        assertEquals(false, result.isOwner)
    }

    @Test
    fun `createItem normalizes input`() {
        val result = service().createItem(
            validRequest(
                itemName = "  Black Wallet  ",
                category = " wallet ",
                color = " Black ",
                description = "  Near entrance  "
            ),
            reporterId = 10
        )

        assertEquals("Black Wallet", result.itemName)
        assertEquals("WALLET", result.category)
        assertEquals("Black", result.color)
        assertEquals("Near entrance", result.description)
    }

    @Test
    fun `createItem rejects short item names`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(itemName = "abc"),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem rejects overly long item names`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(itemName = "a".repeat(151)),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem rejects empty colors`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(color = " "),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem rejects overly long colors`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(color = "a".repeat(51)),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem rejects invalid categories`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(category = "INVALID"),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem rejects nonexistent buildings`() {
        val exception = assertFailsWith<ResponseStatusException> {
            service().createItem(
                validRequest(buildingId = 999),
                reporterId = 10
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, exception.statusCode)
    }

    @Test
    fun `createItem includes building information`() {
        val result = service().createItem(
            validRequest(buildingId = 1),
            reporterId = 10
        )

        assertEquals(1, result.buildingId)
        assertEquals("Library", result.buildingName)
        assertEquals(36.65, result.latitude)
        assertEquals(-121.79, result.longitude)
    }

    @Test
    fun `getItem works without a building`() {
        val result = service(listOf(item())).getItem(1)

        assertNull(result.buildingId)
        assertNull(result.buildingName)
        assertNull(result.latitude)
        assertNull(result.longitude)
    }

@Test
fun `getItem includes building details`() {
    val existingItem = item(buildingId = 1).copy(
        latitude = 36.65,
        longitude = -121.79
    )

    val result = service(
        listOf(existingItem)
    ).getItem(1)

    assertEquals("Library", result.buildingName)
    assertEquals(36.65, result.latitude)
    assertEquals(-121.79, result.longitude)
}

    @Test
    fun `getItem handles a building that no longer exists`() {
        val result = service(
            listOf(item(buildingId = 999))
        ).getItem(1)

        assertEquals(999, result.buildingId)
        assertNull(result.buildingName)
    }
}
