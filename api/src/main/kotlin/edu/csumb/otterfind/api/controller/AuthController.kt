package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.config.AppProperties
import edu.csumb.otterfind.api.service.AccountService
import edu.csumb.otterfind.api.service.AppTokenService
import edu.csumb.otterfind.api.service.GitHubIdentityClient
import jakarta.validation.Valid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/** The code and PKCE verifier from the same Expo authorization request. */
data class CodeExchangeRequest(
    @field:NotBlank @field:Size(max = 2048) val code: String,
    @field:Pattern(regexp = "[A-Za-z0-9._~-]{43,128}") val codeVerifier: String,
    @field:NotBlank @field:Size(max = 2048) val redirectUri: String,
)

/** Public account fields returned after sign-in. */
data class AuthUserResponse(val id: Long, val email: String?, val displayName: String, val role: String)

/** The app token is distinct from GitHub's provider token, which never leaves the identity client. */
data class AuthResponse(val token: String, val user: AuthUserResponse)

/** Stateless backend code exchange from Appendix I, sections 3.4 and 3.5. */
@RestController
@RequestMapping("/auth")
class AuthController(
    private val github: GitHubIdentityClient,
    private val accounts: AccountService,
    private val tokens: AppTokenService,
    private val properties: AppProperties,
) {
    /** Completes GitHub sign-in, creating an account only after the provider identity has been verified. */
    @PostMapping("/github")
    fun github(@Valid @RequestBody request: CodeExchangeRequest): ResponseEntity<AuthResponse> {
        if (request.redirectUri !in properties.oauth.github.redirectUris) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "This sign-in callback URL is not allowed.")
        }
        val identity = github.exchange(request.code, request.codeVerifier, request.redirectUri)
        val user = accounts.findOrCreate(identity)
        val response = AuthResponse(
            tokens.issueFor(user),
            AuthUserResponse(requireNotNull(user.id), user.email, user.displayName, user.role),
        )
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response)
    }
}
