package edu.csumb.otterfind.api.config

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import io.restassured.RestAssured.given
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
import kotlin.test.assertTrue

/** Checks the promises in docs/error-model.md. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ErrorModelTest {
    @LocalServerPort
    private var port = 0

    @Value("\${app.jwt.secret-base64}")
    private lateinit var secretBase64: String

    @Value("\${app.jwt.issuer}")
    private lateinit var issuer: String

    private fun token(): String {
        val claims = JWTClaimsSet.Builder()
            .subject("user-1")
            .issuer(issuer)
            .expirationTime(Date.from(Instant.now().plus(Duration.ofHours(1))))
            .build()
        return SignedJWT(JWSHeader(JWSAlgorithm.HS256), claims)
            .apply { sign(MACSigner(Base64.getDecoder().decode(secretBase64))) }
            .serialize()
    }

    @Test
    fun `an unknown path answers with Problem Details`() {
        val response = given().port(port).header("Authorization", "Bearer ${token()}").get("/api/no-such-route")

        assertEquals(404, response.statusCode())
        assertTrue(response.contentType().startsWith("application/problem+json"), "Content type was ${response.contentType()}")
        assertEquals(404, response.jsonPath().getInt("status"))
        assertEquals("Not Found", response.jsonPath().getString("title"))
        assertEquals("/api/no-such-route", response.jsonPath().getString("instance"))
    }
}
