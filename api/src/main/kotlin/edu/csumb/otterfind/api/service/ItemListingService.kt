package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.Building
import edu.csumb.otterfind.api.repository.BuildingRepository
import edu.csumb.otterfind.api.repository.ItemListing
import edu.csumb.otterfind.api.repository.ItemListingRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.Instant

data class CreateItemRequest(
    val itemName: String,
    val category: String,
    val color: String,
    val isOwner: Boolean,
    val buildingId: Long? = null,
    val description: String = ""
)

data class ItemListingResponse(
    val id: Long,
    val itemName: String,
    val category: String,
    val color: String,
    val isOwner: Boolean,
    val listingType: String,
    val buildingId: Long?,
    val buildingName: String?,
    val latitude: Double?,
    val longitude: Double?,
    val description: String,
    val status: String,
    val createdAt: Instant
)

@Service
class ItemListingService(
    private val itemRepository: ItemListingRepository,
    private val buildingRepository: BuildingRepository
) {
    private val allowedCategories = setOf(
        "PHONE",
        "LAPTOP",
        "WALLET",
        "PETS",
        "BACKPACK",
        "CHARGER",
        "PERSONAL_ITEM",
        "MISC"
    )

    fun listItems(): List<ItemListingResponse> =
        itemRepository.findAll().map { toResponse(it) }

    fun getItem(id: Long): ItemListingResponse {
        val item = itemRepository.findById(id)
            .orElseThrow {
                ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Item not found"
                )
            }

        return toResponse(item)
    }

    fun createItem(
        request: CreateItemRequest,
        reporterId: Long
    ): ItemListingResponse {
        val category = request.category.trim().uppercase()
        val name = request.itemName.trim()
        val color = request.color.trim()

        if (name.length !in 4..150) {
            badRequest(
                "Item name must be 4 to 150 characters"
            )
        }

        if (color.length !in 1..50) {
            badRequest(
                "Color must be 1 to 50 characters"
            )
        }

        if (category !in allowedCategories) {
            badRequest("Invalid category")
        }

        val building = request.buildingId?.let { id ->
            buildingRepository.findById(id).orElseThrow {
                ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selected building does not exist"
                )
            }
        }

        val listing = ItemListing(
            ownerId = reporterId,
            buildingId = building?.id,
            itemName = name,
            category = category,
            color = color,
            listingType = if (request.isOwner) {
                "LOST"
            } else {
                "FOUND"
            },
            description = request.description.trim(),
            latitude = building?.latitude,
            longitude = building?.longitude
        )

        return toResponse(itemRepository.save(listing))
    }

    private fun toResponse(
        item: ItemListing
    ): ItemListingResponse {
        val building: Building? = item.buildingId?.let {
            buildingRepository.findById(it).orElse(null)
        }

        return ItemListingResponse(
            id = requireNotNull(item.id),
            itemName = item.itemName,
            category = item.category,
            color = item.color,
            isOwner = item.listingType == "LOST",
            listingType = item.listingType,
            buildingId = item.buildingId,
            buildingName = building?.name,
            latitude = item.latitude,
            longitude = item.longitude,
            description = item.description,
            status = item.status,
            createdAt = item.createdAt
        )
    }

    private fun badRequest(message: String): Nothing =
        throw ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            message
        )
}
