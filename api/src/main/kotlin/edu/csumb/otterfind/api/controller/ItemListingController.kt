
package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.service.CreateItemRequest
import edu.csumb.otterfind.api.service.ItemListingResponse
import edu.csumb.otterfind.api.service.ItemListingService
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api/items")
class ItemListingController(
    private val itemService: ItemListingService
) {
    @GetMapping
    fun listItems(): List<ItemListingResponse> =
        itemService.listItems()

    @GetMapping("/{id}")
    fun getItem(
        @PathVariable id: Long
    ): ItemListingResponse =
        itemService.getItem(id)

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createItem(
        @RequestBody request: CreateItemRequest,
        @AuthenticationPrincipal jwt: Jwt
    ): ItemListingResponse {
        val reporterId = jwt.subject?.toLongOrNull()
            ?: throw ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Authenticated user is not mapped to an account"
            )

        return itemService.createItem(
            request,
            reporterId
        )
    }
}
