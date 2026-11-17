package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.BuildingRepository
import edu.csumb.otterfind.api.repository.ItemListing
import edu.csumb.otterfind.api.repository.ItemListingRepository
import edu.csumb.otterfind.api.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Instant
import java.time.temporal.ChronoUnit

/** Posts, reads and deletes lost and found listings. */
@Service
class ListingService(
    private val listings: ItemListingRepository,
    private val buildings: BuildingRepository,
    private val users: UserRepository,
    private val clock: Clock,
) {
    /** Returns every active listing, newest first. */
    fun list(viewerId: Long): List<ListingResponse> = listings.findActiveRows().map { it.toResponse(viewerId) }

    /** Returns one listing, or fails with a 404. */
    fun get(id: Long, viewerId: Long): ListingResponse = rowOrNotFound(id).toResponse(viewerId)

    /** Validates and saves a listing owned by [ownerId], and returns it. */
    fun create(request: ListingRequest, ownerId: Long): ListingResponse {
        // A token stays valid for up to an hour after its account is deleted.
        if (!users.existsById(ownerId)) throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "This account no longer exists.")
        val now = Instant.now(clock).truncatedTo(ChronoUnit.MILLIS)
        val valid = validateListing(request, buildings::existsById, now)
        val saved = listings.save(
            ItemListing(
                ownerId = ownerId,
                buildingId = valid.buildingId,
                listingType = valid.listingType,
                category = valid.category,
                itemName = valid.title,
                description = valid.description,
                floor = valid.floor,
                latitude = valid.latitude,
                longitude = valid.longitude,
                lastSeenAt = valid.lastSeenAt,
                createdAt = now,
            ),
        )
        return rowOrNotFound(checkNotNull(saved.id)).toResponse(ownerId)
    }

    /** Deletes a listing if [requesterId] owns it. Fails with a 404 if it doesn't exist, or a 403 if it's someone else's. */
    fun delete(id: Long, requesterId: Long) {
        val listing = listings.findById(id).orElseThrow { notFound() }
        if (listing.ownerId != requesterId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the person who posted this can delete it.")
        }
        listings.deleteById(id)
    }

    private fun rowOrNotFound(id: Long) = listings.findRowById(id) ?: throw notFound()

    private fun notFound() = ResponseStatusException(HttpStatus.NOT_FOUND, "That listing doesn't exist.")
}
