package edu.csumb.otterfind.api.service

import com.nimbusds.jose.jwk.source.ImmutableSecret
import edu.csumb.otterfind.api.config.AppProperties
import edu.csumb.otterfind.api.repository.User
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.stereotype.Service
import java.time.Clock
import java.util.Base64
import javax.crypto.spec.SecretKeySpec

/** Issues the API's own short-lived HS256 tokens, using the same key and issuer as its decoder. */
@Service
class AppTokenService(private val properties: AppProperties, private val clock: Clock) {
    private val encoder = NimbusJwtEncoder(
        ImmutableSecret(SecretKeySpec(Base64.getDecoder().decode(properties.jwt.secretBase64), "HmacSHA256")),
    )

    init {
        require(!properties.jwt.ttl.isNegative && !properties.jwt.ttl.isZero) { "APP_JWT_TTL must be a positive duration" }
    }

    /** The subject identifies the saved OtterFind account, never the provider account or email. */
    fun issueFor(user: User): String {
        val now = clock.instant()
        val claims = JwtClaimsSet.builder()
            .issuer(properties.jwt.issuer)
            .issuedAt(now)
            .expiresAt(now.plus(properties.jwt.ttl))
            .subject(requireNotNull(user.id).toString())
            .claims { claims -> user.email?.let { claims["email"] = it } }
            .claim("roles", listOf(user.role))
            .build()
        val header = JwsHeader.with(MacAlgorithm.HS256).build()
        return encoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue
    }
}
