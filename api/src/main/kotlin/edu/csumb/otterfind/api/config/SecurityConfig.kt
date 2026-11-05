package edu.csumb.otterfind.api.config

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import java.util.Base64
import javax.crypto.spec.SecretKeySpec

private val PUBLIC_PATHS = listOf(
    // Render's health check calls this without a token.
    "/actuator/health",
    "/v3/api-docs/**",
    "/swagger-ui/**",
    "/swagger-ui.html",
    // Spring forwards failed requests here. Without this, an error on a public path turns into a 401.
    "/error",
)

// HS256 needs a key of at least 256 bits.
private const val MIN_SECRET_BYTES = 32

/** Makes the API an OAuth2 resource server that accepts its own HS256 access tokens. */
@Configuration
@EnableConfigurationProperties(AppProperties::class)
class SecurityConfig {
    /** Requires a valid bearer token on every path outside [PUBLIC_PATHS]. */
    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            cors { }
            // Tokens travel in the Authorization header, so there is no session or cookie for CSRF to abuse.
            csrf { disable() }
            sessionManagement { sessionCreationPolicy = SessionCreationPolicy.STATELESS }
            authorizeHttpRequests {
                PUBLIC_PATHS.forEach { authorize(it, permitAll) }
                // Campus reference data with nothing about any user. Only reading is public.
                authorize(HttpMethod.GET, "/api/buildings", permitAll)
                authorize(anyRequest, authenticated)
            }
            oauth2ResourceServer { jwt { } }
        }
        return http.build()
    }

    /** Verifies the signature, expiry and issuer of each token. */
    @Bean
    fun jwtDecoder(properties: AppProperties): JwtDecoder {
        val secret = runCatching { Base64.getDecoder().decode(properties.jwt.secretBase64) }.getOrDefault(ByteArray(0))
        require(secret.size >= MIN_SECRET_BYTES) {
            "APP_JWT_SECRET_BASE64 must be base64 for at least $MIN_SECRET_BYTES bytes. Generate one with: openssl rand -base64 32"
        }
        require(properties.jwt.issuer.isNotBlank()) { "APP_JWT_ISSUER must be set" }
        val key = SecretKeySpec(secret, "HmacSHA256")
        val decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build()
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.jwt.issuer))
        return decoder
    }

    /** Lets the configured browser origins call the API. */
    @Bean
    fun corsConfigurationSource(properties: AppProperties): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOrigins = properties.cors.origins
            allowedMethods = listOf("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            allowedHeaders = listOf("Authorization", "Content-Type")
        }
        return UrlBasedCorsConfigurationSource().apply { registerCorsConfiguration("/**", configuration) }
    }
}
