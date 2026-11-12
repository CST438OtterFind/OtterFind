package edu.csumb.otterfind.api.repository

import org.springframework.data.annotation.Id
import org.springframework.data.relational.core.mapping.Table
import org.springframework.data.repository.ListCrudRepository
import java.time.Instant

@Table("item_listings")
data class ItemListing(
    @Id
    val id: Long? = null,

    val ownerId: Long,
    val buildingId: Long? = null,

    val itemName: String,
    val category: String,
    val color: String,
    val listingType: String,

    val description: String = "",
    val imageUrl: String? = null,
    val floor: Int? = null,

    val latitude: Double? = null,
    val longitude: Double? = null,

    val status: String = "ACTIVE",
    val lastSeenAt: Instant? = null,
    val createdAt: Instant = Instant.now()
)

interface ItemListingRepository :
    ListCrudRepository<ItemListing, Long> {

    fun findByOwnerId(ownerId: Long): List<ItemListing>

    fun findByCategory(category: String): List<ItemListing>

    fun findByListingType(
        listingType: String
    ): List<ItemListing>
}
