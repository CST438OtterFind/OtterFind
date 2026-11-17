package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.service.ListingRequest
import edu.csumb.otterfind.api.service.ListingResponse
import edu.csumb.otterfind.api.service.ListingService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.net.URI

/** Serves `/api/items`, as described in docs/openapi.yaml. */
@RestController
@RequestMapping("/api/items")
class ItemController(private val listings: ListingService) {
    /** Lists every active listing, newest first. */
    @GetMapping
    fun listItems(@AuthenticationPrincipal jwt: Jwt): List<ListingResponse> = listings.list(jwt.userId())

    /** Posts a listing owned by the signed-in user. */
    @PostMapping
    fun createItem(@RequestBody request: ListingRequest, @AuthenticationPrincipal jwt: Jwt): ResponseEntity<ListingResponse> {
        val saved = listings.create(request, jwt.userId())
        return ResponseEntity.created(URI.create("/api/items/${saved.id}")).body(saved)
    }

    /** Shows one listing. */
    @GetMapping("/{itemId}")
    fun getItem(@PathVariable itemId: Long, @AuthenticationPrincipal jwt: Jwt): ListingResponse = listings.get(itemId, jwt.userId())

    /** Deletes the signed-in user's own listing. */
    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteItem(@PathVariable itemId: Long, @AuthenticationPrincipal jwt: Jwt) = listings.delete(itemId, jwt.userId())

    /** The token's subject is the user's ID, so this is the only place that needs to know how tokens identify users. */
    private fun Jwt.userId(): Long =
        subject?.toLongOrNull() ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "This access token doesn't name a user.")
}
