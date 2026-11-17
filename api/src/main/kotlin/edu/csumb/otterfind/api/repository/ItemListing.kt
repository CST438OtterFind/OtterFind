package edu.csumb.otterfind.api.repository

import org.springframework.data.annotation.Id
import org.springframework.data.jdbc.repository.query.Query
import org.springframework.data.relational.core.mapping.Table
import org.springframework.data.repository.ListCrudRepository
import java.time.Instant

/** Whether someone lost the item or found it. */
enum class ListingType { LOST, FOUND }

/** What kind of item a listing is about. */
enum class ListingCategory { PET, ELECTRONICS, KEYS, BOOKS, CLOTHING, OTHER }

/** Whether a listing is still open. */
enum class ListingStatus { ACTIVE, RESOLVED }

/** A lost or found post. Its map pin is [latitude] and [longitude], which are both set or both null. */
@Table("item_listings")
data class ItemListing(
    @Id val id: Long? = null,
    val ownerId: Long,
    val buildingId: Long,
    val listingType: ListingType,
    val category: ListingCategory,
    val itemName: String,
    val description: String?,
    val floor: Int?,
    val latitude: Double?,
    val longitude: Double?,
    val status: ListingStatus = ListingStatus.ACTIVE,
    val lastSeenAt: Instant,
    val createdAt: Instant,
)

/** A listing joined to its building's name, so pages don't need a second lookup. */
data class ListingRow(
    val id: Long,
    val ownerId: Long,
    val buildingId: Long,
    val buildingName: String,
    val listingType: ListingType,
    val category: ListingCategory,
    val itemName: String,
    val description: String?,
    val floor: Int?,
    val latitude: Double?,
    val longitude: Double?,
    val status: ListingStatus,
    val lastSeenAt: Instant,
    val createdAt: Instant,
)

private const val SELECT_ROWS = """
    SELECT l.id, l.owner_id, l.building_id, b.name AS building_name, l.listing_type, l.category, l.item_name,
           l.description, l.floor, l.latitude, l.longitude, l.status, l.last_seen_at, l.created_at
    FROM item_listings l
    JOIN buildings b ON b.id = l.building_id
"""

/** Reads and writes listings in Postgres. */
interface ItemListingRepository : ListCrudRepository<ItemListing, Long> {
    /** Every active listing, newest first. The ID breaks ties, so the order never changes between calls. */
    @Query("$SELECT_ROWS WHERE l.status = 'ACTIVE' ORDER BY l.created_at DESC, l.id DESC")
    fun findActiveRows(): List<ListingRow>

    /** One listing, or null if no listing has this ID. */
    @Query("$SELECT_ROWS WHERE l.id = :id")
    fun findRowById(id: Long): ListingRow?
}
