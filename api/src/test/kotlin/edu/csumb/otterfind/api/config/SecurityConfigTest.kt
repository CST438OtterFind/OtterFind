package edu.csumb.otterfind.api.config

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.restassured.RestAssured.given
import io.restassured.specification.RequestSpecification
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.test.context.ActiveProfiles
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.Date
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityConfigTest {
    @LocalServerPort
    private var port = 0

    @Value("\${app.jwt.secret-base64}")
    private lateinit var secretBase64: String

    @Value("\${app.jwt.issuer}")
    private lateinit var issuer: String

    private fun request(): RequestSpecification = given().port(port)

    private fun token(
        secret: ByteArray = Base64.getDecoder().decode(secretBase64),
        tokenIssuer: String = issuer,
        expiresAt: Instant = Instant.now().plus(Duration.ofHours(1)),
    ): String {
        val claims = JWTClaimsSet.Builder()
            .subject("user-1")
            .issuer(tokenIssuer)
            .expirationTime(Date.from(expiresAt))
            .build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims)
            .apply { sign(MACSigner(secret)) }
            .serialize()
    }

    private fun preflightFrom(origin: String) = request()
        .header("Origin", origin)
        .header("Access-Control-Request-Method", "POST")
        .header("Access-Control-Request-Headers", "Authorization, Content-Type")
        .options("/api/items")

    @Test
    fun `health check needs no token, because Render calls it without one`() {
        assertEquals(200, request().get("/actuator/health").statusCode())
    }

    @Test
    fun `API docs need no token`() {
        assertEquals(200, request().get("/v3/api-docs").statusCode())
    }

    @Test
    fun `an error on a public path keeps its real status instead of becoming a 401`() {
        assertEquals(404, request().get("/v3/api-docs/no-such-group").statusCode())
    }

    @Test
    fun `a request without a token is rejected`() {
        assertEquals(401, request().get("/api/items").statusCode())
    }

    @Test
    fun `a valid token gets past security, so an unknown path is a 404 and not a 401`() {
        val response = request().header("Authorization", "Bearer ${token()}").get("/api/unknown-endpoint")
        assertEquals(404, response.statusCode())
    }

    @Test
    fun `a token signed with another key is rejected`() {
        val otherKey = "another-secret-another-secret-another-secret".toByteArray()
        val response = request().header("Authorization", "Bearer ${token(secret = otherKey)}").get("/api/items")
        assertEquals(401, response.statusCode())
    }

    @Test
    fun `a token from another issuer is rejected`() {
        val response = request().header("Authorization", "Bearer ${token(tokenIssuer = "http://elsewhere.test")}").get("/api/items")
        assertEquals(401, response.statusCode())
    }

    @Test
    fun `an expired token is rejected`() {
        val expired = token(expiresAt = Instant.now().minus(Duration.ofMinutes(5)))
        val response = request().header("Authorization", "Bearer $expired").get("/api/items")
        assertEquals(401, response.statusCode())
    }

    @Test
    fun `preflight from a configured origin is allowed`() {
        val response = preflightFrom("https://web.otterfind.test")
        assertEquals(200, response.statusCode())
        assertEquals("https://web.otterfind.test", response.header("Access-Control-Allow-Origin"))
        assertTrue(response.header("Access-Control-Allow-Methods").contains("POST"))
        assertTrue(response.header("Access-Control-Allow-Headers").contains("Authorization", ignoreCase = true))
    }

    @Test
    fun `preflight from any other origin is refused`() {
        val response = preflightFrom("https://attacker.test")
        assertEquals(403, response.statusCode())
        assertNull(response.header("Access-Control-Allow-Origin"))
    }
}
