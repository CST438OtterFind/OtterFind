package edu.csumb.otterfind.api.controller

import com.nimbusds.jose.jwk.source.ImmutableSecret
import edu.csumb.otterfind.api.config.AppProperties
import edu.csumb.otterfind.api.config.E2E_PROFILE
import edu.csumb.otterfind.api.repository.UserRepository
import org.springframework.context.annotation.Profile
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Clock
import java.time.Duration
import java.util.Base64
import javax.crypto.spec.SecretKeySpec

/** The access token for a test account. */
data class TestTokenResponse(val token: String)

private val TEST_TOKEN_LIFETIME = Duration.ofHours(1)

/** Mints real access tokens for the seeded test accounts, standing in for sign-in. Only exists under the e2e profile. */
@RestController
@Profile(E2E_PROFILE)
class TestAuthController(
    private val users: UserRepository,
    private val properties: AppProperties,
    private val clock: Clock,
) {
    /** Issues a token for the account with this email. */
    @PostMapping("/test/token")
    fun tokenFor(@RequestParam email: String): TestTokenResponse {
        val user = users.findByEmail(email) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "No test account has that email.")
        val key = SecretKeySpec(Base64.getDecoder().decode(properties.jwt.secretBase64), "HmacSHA256")
        val now = clock.instant()
        val claims = JwtClaimsSet.builder()
            .issuer(properties.jwt.issuer)
            .issuedAt(now)
            .expiresAt(now.plus(TEST_TOKEN_LIFETIME))
            .subject(user.id.toString())
            .build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        return TestTokenResponse(NimbusJwtEncoder(ImmutableSecret(key)).encode(JwtEncoderParameters.from(header, claims)).tokenValue)
    }
}
