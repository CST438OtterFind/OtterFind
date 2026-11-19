package edu.csumb.otterfind.api.service

import com.fasterxml.jackson.annotation.JsonProperty
import edu.csumb.otterfind.api.config.AppProperties
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.core.ParameterizedTypeReference
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.server.ResponseStatusException
import java.net.http.HttpClient
import java.time.Duration

private const val TOKEN_URL = "https://github.com/login/oauth/access_token"
private const val USER_URL = "https://api.github.com/user"
private const val EMAILS_URL = "https://api.github.com/user/emails"
private val CONNECT_TIMEOUT = Duration.ofSeconds(10)
private val READ_TIMEOUT = Duration.ofSeconds(20)
private const val SIGN_IN_FAILED = "GitHub could not complete sign-in. Please try again."

/** Exchanges a code and PKCE verifier for a verified GitHub identity; it never persists provider tokens. */
@Service
class GitHubIdentityClient internal constructor(
    private val credentials: AppProperties.GitHub,
    private val http: RestClient,
) {
    /** Uses the server's credentials and bounded timeouts for GitHub requests. */
    @Autowired
    constructor(properties: AppProperties) : this(properties.oauth.github, githubHttpClient())

    /** The redirect URI must be identical to the URI used in the app's authorization request. */
    fun exchange(code: String, codeVerifier: String, redirectUri: String): ProviderIdentity {
        if (credentials.clientId.isBlank() || credentials.clientSecret.isBlank()) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "GitHub sign-in is not configured.")
        }
        if (code.isBlank() || codeVerifier.isBlank() || redirectUri.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Code, PKCE verifier and redirect URI are required.")
        }
        val accessToken = exchangeCode(code, codeVerifier, redirectUri)
        val user = githubRequest { get(USER_URL, accessToken).body(GitHubUser::class.java) }
        val id = requireProviderValue(user?.id?.takeIf { it > 0 })
        val primary = verifiedPrimaryEmail(accessToken)
        return ProviderIdentity(
            provider = "GITHUB",
            providerUserId = id.toString(),
            email = requireNotNull(primary.email),
            emailVerified = true,
            displayName = user?.name?.takeIf { it.isNotBlank() } ?: user?.login?.takeIf { it.isNotBlank() } ?: id.toString(),
        )
    }

    private fun exchangeCode(code: String, verifier: String, redirectUri: String): String {
        val form = LinkedMultiValueMap<String, String>().apply {
            add("client_id", credentials.clientId)
            add("client_secret", credentials.clientSecret)
            add("code", code)
            add("code_verifier", verifier)
            add("redirect_uri", redirectUri)
        }
        val response = requireProviderValue(githubRequest {
            http.post().uri(TOKEN_URL).accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED).body(form).retrieve().body(GitHubTokenResponse::class.java)
        })
        if (response.error != null) {
            if (response.error in setOf("bad_verification_code", "incorrect_code_verifier", "redirect_uri_mismatch")) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, SIGN_IN_FAILED)
            }
            throw providerFailure()
        }
        return requireProviderValue(response.accessToken?.takeIf { it.isNotBlank() })
    }

    private fun verifiedPrimaryEmail(accessToken: String): GitHubEmail {
        var page = 1
        var hasMore = true
        while (hasMore) {
            // Construct every URL ourselves so even a malformed Link header cannot send the token to another host.
            val url = if (page == 1) EMAILS_URL else "$EMAILS_URL?page=$page"
            val response = githubRequest {
                get(url, accessToken).toEntity(object : ParameterizedTypeReference<List<GitHubEmail>>() {})
            }
            val emails = requireProviderValue(response.body)
            emails.firstOrNull { it.primary && it.verified && !it.email.isNullOrBlank() }?.let { return it }
            hasMore = response.headers[HttpHeaders.LINK].orEmpty().any { it.contains("rel=\"next\"") }
            page += 1
        }
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Verify your primary email at GitHub before signing in.")
    }

    private fun get(url: String, accessToken: String): RestClient.ResponseSpec = http.get().uri(url)
        .header("Authorization", "Bearer $accessToken")
        .header("User-Agent", "OtterFind")
        .accept(MediaType.parseMediaType("application/vnd.github+json"))
        .retrieve()

    // Provider error bodies can contain credentials or tokens: deliberately discard them rather than logging or returning them.
    @Suppress("SwallowedException")
    private fun <T> githubRequest(request: () -> T): T = try {
        request()
    } catch (exception: RestClientResponseException) {
        val status = if (exception.statusCode == HttpStatus.UNAUTHORIZED || exception.statusCode == HttpStatus.BAD_REQUEST) {
            HttpStatus.BAD_REQUEST
        } else {
            HttpStatus.BAD_GATEWAY
        }
        throw ResponseStatusException(status, SIGN_IN_FAILED)
    } catch (exception: RestClientException) {
        throw providerFailure()
    }
}

private fun <T : Any> requireProviderValue(value: T?): T = value ?: throw providerFailure()

private fun providerFailure() = ResponseStatusException(HttpStatus.BAD_GATEWAY, SIGN_IN_FAILED)

private fun githubHttpClient(): RestClient {
    val client = HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build()
    val factory = JdkClientHttpRequestFactory(client).apply { setReadTimeout(READ_TIMEOUT) }
    return RestClient.builder().requestFactory(factory).build()
}

private data class GitHubTokenResponse(
    @param:JsonProperty("access_token") val accessToken: String? = null,
    val error: String? = null,
)

private data class GitHubUser(val id: Long? = null, val login: String? = null, val name: String? = null)

private data class GitHubEmail(val email: String? = null, val primary: Boolean = false, val verified: Boolean = false)
