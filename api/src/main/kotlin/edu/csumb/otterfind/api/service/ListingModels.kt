package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.ListingCategory
import edu.csumb.otterfind.api.repository.ListingRow
import edu.csumb.otterfind.api.repository.ListingStatus
import edu.csumb.otterfind.api.repository.ListingType
import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.ErrorResponseException
import java.time.Instant

/**
 * The body of `POST /api/items`. Every field is nullable so that a missing one is reported beside its
 * field by [validateListing], rather than failing as unreadable JSON.
 */
data class ListingRequest(
    val title: String? = null,
    val listingType: String? = null,
    val category: String? = null,
    val buildingId: Long? = null,
    val floor: Int? = null,
    val description: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val lastSeenAt: Instant? = null,
)

/** A listing as described in docs/openapi.yaml. */
data class ListingResponse(
    val id: Long,
    val title: String,
    val listingType: ListingType,
    val category: ListingCategory,
    val status: ListingStatus,
    val description: String?,
    val building: BuildingSummary,
    val floor: Int?,
    val latitude: Double?,
    val longitude: Double?,
    val lastSeenAt: Instant,
    val createdAt: Instant,
    val mine: Boolean,
)

/** The part of a building that a listing shows. */
data class BuildingSummary(val id: Long, val name: String)

/** One invalid field, and the message to show beside it. See docs/error-model.md. */
data class FieldProblem(val field: String, val message: String)

/** A 400 that lists every invalid field at once. Spring renders it as Problem Details. */
class FieldValidationException(val problems: List<FieldProblem>) : ErrorResponseException(
    HttpStatus.BAD_REQUEST,
    ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Some fields are invalid.").apply { setProperty("errors", problems) },
    null,
)

/** Builds the response for a listing, as seen by the user with [viewerId]. */
fun ListingRow.toResponse(viewerId: Long) = ListingResponse(
    id = id,
    title = itemName,
    listingType = listingType,
    category = category,
    status = status,
    description = description,
    building = BuildingSummary(buildingId, buildingName),
    floor = floor,
    latitude = latitude,
    longitude = longitude,
    lastSeenAt = lastSeenAt,
    createdAt = createdAt,
    mine = ownerId == viewerId,
)
