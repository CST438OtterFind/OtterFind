package edu.csumb.otterfind.api.config

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** The `app.*` settings in application.yaml. */
@ConfigurationProperties("app")
data class AppProperties(
    val jwt: Jwt,
    val cors: Cors = Cors(),
    val oauth: OAuth = OAuth(),
) {
    /** Verifies the API's own access tokens. */
    data class Jwt(
        val secretBase64: String,
        val issuer: String,
        val ttl: Duration = Duration.ofHours(1),
    )

    /** Provider credentials used by the backend token exchange (Appendix I, section 3.4). */
    data class OAuth(
        val github: GitHub = GitHub(),
    )

    /** The client ID is public; the client secret stays on the API. */
    data class GitHub(
        val clientId: String = "",
        val clientSecret: String = "",
        val redirectUris: List<String> = listOf("http://localhost:8081/auth"),
    )

    /** Browser origins allowed to call the API. */
    data class Cors(
        val origins: List<String> = emptyList(),
    )
}
