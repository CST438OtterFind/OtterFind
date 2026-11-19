package edu.csumb.otterfind.api.controller

import edu.csumb.otterfind.api.config.AppProperties
import edu.csumb.otterfind.api.service.AccountService
import edu.csumb.otterfind.api.service.GitHubIdentityClient
import edu.csumb.otterfind.api.service.ProviderIdentity
import io.restassured.RestAssured.given
import io.restassured.response.Response
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.web.server.ResponseStatusException
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers
import org.testcontainers.postgresql.PostgreSQLContainer
import java.time.Duration
import java.util.concurrent.Callable
import java.util.concurrent.CyclicBarrier
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** Real HTTP, security, JWT signing and Postgres, with GitHub stubbed so CI never needs provider credentials. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class GitHubAuthApiTest {
    companion object {
        @Container
        @JvmStatic
        val postgres = PostgreSQLContainer("postgres:17-alpine")

        @DynamicPropertySource
        @JvmStatic
        fun database(registry: DynamicPropertyRegistry) {
            registry.add("spring.datasource.url", postgres::getJdbcUrl)
            registry.add("spring.datasource.username", postgres::getUsername)
            registry.add("spring.datasource.password", postgres::getPassword)
        }
    }

    @LocalServerPort
    private var port = 0

    @MockitoBean
    private lateinit var github: GitHubIdentityClient

    @Autowired
    private lateinit var jdbc: JdbcTemplate

    @Autowired
    private lateinit var decoder: JwtDecoder

    @Autowired
    private lateinit var properties: AppProperties

    @Autowired
    private lateinit var accounts: AccountService

    private val identity = ProviderIdentity("GITHUB", "12345", "octocat@example.test", true, "Octo Cat")
    private val verifier = "a".repeat(43)

    @BeforeEach
    fun reset() {
        jdbc.update("DELETE FROM users")
        `when`(github.exchange(anyString(), anyString(), anyString())).thenReturn(identity)
    }

    private fun body(): Map<String, Any> = mapOf(
        "code" to "test-code",
        "codeVerifier" to verifier,
        "redirectUri" to "http://localhost:8081/auth",
    )

    private fun signIn(body: Map<String, Any> = body()): Response = given().port(port)
        .contentType("application/json").body(body).post("/auth/github")

    private fun count(): Int = jdbc.queryForObject("SELECT COUNT(*) FROM users", Int::class.java)!!

    @Test
    fun `first sign-in creates an account and returns a usable short-lived app JWT`() {
        val response = signIn(body() + ("role" to "ADMIN"))
        assertEquals(200, response.statusCode(), response.asString())
        val userId = response.jsonPath().getLong("user.id")
        val token = response.jsonPath().getString("token")
        val jwt = decoder.decode(token)
        assertEquals(userId.toString(), jwt.subject)
        assertEquals(properties.jwt.issuer, jwt.issuer.toString())
        assertEquals(listOf("USER"), jwt.getClaimAsStringList("roles"))
        assertEquals(identity.email, jwt.getClaimAsString("email"))
        assertEquals(properties.jwt.ttl, Duration.between(jwt.issuedAt, jwt.expiresAt))
        assertEquals(identity.displayName, response.jsonPath().getString("user.displayName"))
        assertEquals("USER", response.jsonPath().getString("user.role"))
        assertTrue(response.header("Cache-Control").contains("no-store"))
        assertFalse(response.asString().contains("oauthProviderUserId"))
        assertEquals(1, count())
        assertEquals("12345", jdbc.queryForObject("SELECT oauth_provider_user_id FROM users WHERE id = ?", String::class.java, userId))
        assertEquals(200, given().port(port).header("Authorization", "Bearer $token").get("/api/items").statusCode())
        assertEquals(401, given().port(port).get("/api/items").statusCode())
    }

    @Test
    fun `returning identity keeps its account ID and saved display name even if provider email changes`() {
        val first = signIn().then().statusCode(200).extract().jsonPath().getLong("user.id")
        jdbc.update("UPDATE users SET display_name = 'Chosen Name' WHERE id = ?", first)
        `when`(github.exchange(anyString(), anyString(), anyString())).thenReturn(identity.copy(email = "changed@example.test"))
        val response = signIn()
        assertEquals(200, response.statusCode(), response.asString())
        assertEquals(first, response.jsonPath().getLong("user.id"))
        assertEquals("Chosen Name", response.jsonPath().getString("user.displayName"))
        assertEquals(1, count())
    }

    @Test
    fun `email registered through Google returns 409 naming Google and never links accounts`() {
        jdbc.update(
            "INSERT INTO users (email, display_name, oauth_provider, oauth_provider_user_id) VALUES (?, 'Existing', 'GOOGLE', 'google-id')",
            identity.email.uppercase(),
        )
        val response = signIn()
        assertEquals(409, response.statusCode(), response.asString())
        assertTrue(response.jsonPath().getString("detail").contains("Google"))
        assertEquals(1, count())
        assertEquals("GOOGLE", jdbc.queryForObject("SELECT oauth_provider FROM users", String::class.java))
        assertFalse(response.asString().contains("\"token\""))
    }

    @Test
    fun `unverified email cannot create a user`() {
        `when`(github.exchange(anyString(), anyString(), anyString())).thenReturn(identity.copy(emailVerified = false))
        assertEquals(400, signIn().statusCode())
        assertEquals(0, count())
    }

    @Test
    fun `invalid code returns a safe problem and no user`() {
        `when`(github.exchange(anyString(), anyString(), anyString()))
            .thenThrow(ResponseStatusException(HttpStatus.BAD_REQUEST, "GitHub could not complete sign-in. Please try again."))
        val response = signIn()
        assertEquals(400, response.statusCode(), response.asString())
        assertTrue(response.contentType().startsWith("application/problem+json"))
        assertEquals(0, count())
    }

    @Test
    fun `invalid fields and unregistered callback URLs are rejected before contacting GitHub`() {
        listOf(
            body() - "code",
            body() + ("code" to " "),
            body() + ("codeVerifier" to "short"),
            body() + ("redirectUri" to "https://other.example/auth"),
        ).forEach { assertEquals(400, signIn(it).statusCode()) }
        verifyNoInteractions(github)
        assertEquals(0, count())
    }

    @Test
    fun `browser preflight for exchange is allowed`() {
        val response = given().port(port).header("Origin", "http://localhost:8081")
            .header("Access-Control-Request-Method", "POST")
            .header("Access-Control-Request-Headers", "Content-Type").options("/auth/github")
        assertEquals(200, response.statusCode())
        assertEquals("http://localhost:8081", response.header("Access-Control-Allow-Origin"))
    }

    @Test
    fun `simultaneous first sign-ins return the same account`() {
        val barrier = CyclicBarrier(2)
        `when`(github.exchange(anyString(), anyString(), anyString())).thenAnswer {
            barrier.await(10, TimeUnit.SECONDS)
            identity
        }
        Executors.newFixedThreadPool(2).use { executor ->
            val responses = executor.invokeAll(List(2) { Callable { signIn() } }, 20, TimeUnit.SECONDS).map { it.get() }
            responses.forEach { assertEquals(200, it.statusCode(), it.asString()) }
            assertEquals(1, responses.map { it.jsonPath().getLong("user.id") }.distinct().size)
        }
        assertEquals(1, count())
    }

    @Test
    fun `account service also enforces verified email for future providers`() {
        val failure = assertFailsWith<ResponseStatusException> { accounts.findOrCreate(identity.copy(emailVerified = false)) }
        assertEquals(HttpStatus.BAD_REQUEST, failure.statusCode)
        assertEquals(0, count())
    }

    @Test
    fun `concurrent account service calls reuse the winner of the unique constraint`() {
        Executors.newFixedThreadPool(4).use { executor ->
            val users = executor.invokeAll(List(4) { Callable { accounts.findOrCreate(identity) } }).map { it.get() }
            assertNotNull(users.first().id)
            assertEquals(1, users.map { it.id }.distinct().size)
        }
        assertEquals(1, count())
    }
}
