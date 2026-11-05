package edu.csumb.otterfind.api.config

import org.junit.jupiter.api.Test
import java.util.Base64
import kotlin.test.assertFailsWith
import kotlin.test.assertContains
import kotlin.test.assertNotNull

/** A bad token setting should stop the API at startup, not fail every sign-in later. */
class JwtDecoderTest {
    private fun secretOf(bytes: Int) = Base64.getEncoder().encodeToString(ByteArray(bytes) { 1 })

    private fun decoder(secretBase64: String, issuer: String = "http://issuer.test") =
        SecurityConfig().jwtDecoder(AppProperties(AppProperties.Jwt(secretBase64, issuer)))

    @Test
    fun `a 256-bit secret is accepted`() {
        assertNotNull(decoder(secretOf(32)))
    }

    @Test
    fun `a blank secret stops startup and names the variable`() {
        val error = assertFailsWith<IllegalArgumentException> { decoder("") }
        assertContains(error.message.orEmpty(), "APP_JWT_SECRET_BASE64")
    }

    @Test
    fun `a secret under 256 bits stops startup and names the variable`() {
        val error = assertFailsWith<IllegalArgumentException> { decoder(secretOf(31)) }
        assertContains(error.message.orEmpty(), "APP_JWT_SECRET_BASE64")
    }

    @Test
    fun `a secret that is not base64 stops startup and names the variable`() {
        val error = assertFailsWith<IllegalArgumentException> { decoder("not base64!") }
        assertContains(error.message.orEmpty(), "APP_JWT_SECRET_BASE64")
    }

    @Test
    fun `a blank issuer stops startup and names the variable`() {
        val error = assertFailsWith<IllegalArgumentException> { decoder(secretOf(32), issuer = "") }
        assertContains(error.message.orEmpty(), "APP_JWT_ISSUER")
    }
}
