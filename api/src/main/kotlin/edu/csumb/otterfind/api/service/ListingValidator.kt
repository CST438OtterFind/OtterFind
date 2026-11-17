package edu.csumb.otterfind.api.service

import edu.csumb.otterfind.api.repository.ListingCategory
import edu.csumb.otterfind.api.repository.ListingType
import java.time.Duration
import java.time.Instant

private const val MIN_TITLE_LENGTH = 4
private const val MAX_TITLE_LENGTH = 120
private const val MAX_DESCRIPTION_LENGTH = 2000
private const val LOWEST_FLOOR = -2
private const val HIGHEST_FLOOR = 20

/** Allows for a phone whose clock runs a little ahead of the server's. */
private val ALLOWED_CLOCK_DIFFERENCE = Duration.ofMinutes(5)

/** A listing request that passed every check in [validateListing]. */
data class ValidListing(
    val title: String,
    val listingType: ListingType,
    val category: ListingCategory,
    val buildingId: Long,
    val floor: Int?,
    val description: String?,
    val latitude: Double?,
    val longitude: Double?,
    val lastSeenAt: Instant,
)

/**
 * Checks a listing request and reports every problem at once, so a user fixes the form in one pass.
 *
 * @param buildingExists whether a building with this ID exists.
 * @param now the current time.
 * @throws FieldValidationException if any field is invalid.
 */
fun validateListing(request: ListingRequest, buildingExists: (Long) -> Boolean, now: Instant): ValidListing {
    val problems = mutableListOf<FieldProblem>()
    val title = checkTitle(request.title, problems)
    val listingType = enumOrNull<ListingType>(request.listingType)
    if (listingType == null) problems += FieldProblem("listingType", "Choose Lost or Found")
    val category = enumOrNull<ListingCategory>(request.category)
    if (category == null) problems += FieldProblem("category", "Choose a category")
    val buildingId = request.buildingId?.takeIf(buildingExists)
    if (buildingId == null) problems += FieldProblem("buildingId", "Choose a building")
    checkOptionalFields(request, problems)
    checkPin(request.latitude, request.longitude, problems)
    val lastSeenAt = request.lastSeenAt ?: now
    if (lastSeenAt.isAfter(now.plus(ALLOWED_CLOCK_DIFFERENCE))) problems += FieldProblem("lastSeenAt", "Last seen can't be in the future")
    if (problems.isNotEmpty()) throw FieldValidationException(problems)

    return ValidListing(
        title = title,
        listingType = checkNotNull(listingType),
        category = checkNotNull(category),
        buildingId = checkNotNull(buildingId),
        floor = request.floor,
        description = request.description?.trim()?.ifEmpty { null },
        latitude = request.latitude,
        longitude = request.longitude,
        lastSeenAt = lastSeenAt,
    )
}

private inline fun <reified T : Enum<T>> enumOrNull(name: String?): T? = enumValues<T>().firstOrNull { it.name == name }

private fun checkTitle(rawTitle: String?, problems: MutableList<FieldProblem>): String {
    val title = rawTitle?.trim().orEmpty()
    if (title.length < MIN_TITLE_LENGTH) problems += FieldProblem("title", "Title must be at least $MIN_TITLE_LENGTH characters")
    if (title.length > MAX_TITLE_LENGTH) problems += FieldProblem("title", "Title must be at most $MAX_TITLE_LENGTH characters")
    return title
}

private fun checkOptionalFields(request: ListingRequest, problems: MutableList<FieldProblem>) {
    if (request.floor != null && request.floor !in LOWEST_FLOOR..HIGHEST_FLOOR) {
        problems += FieldProblem("floor", "Floor must be between $LOWEST_FLOOR and $HIGHEST_FLOOR")
    }
    if ((request.description?.length ?: 0) > MAX_DESCRIPTION_LENGTH) {
        problems += FieldProblem("description", "Description must be at most $MAX_DESCRIPTION_LENGTH characters")
    }
}

private fun checkPin(latitude: Double?, longitude: Double?, problems: MutableList<FieldProblem>) {
    when {
        latitude == null && longitude == null -> Unit
        latitude == null || longitude == null -> problems += FieldProblem("latitude", "A pin needs both a latitude and a longitude")
        !isOnCampus(latitude, longitude) -> problems += FieldProblem("latitude", "Pins must be on the CSUMB campus")
    }
}
